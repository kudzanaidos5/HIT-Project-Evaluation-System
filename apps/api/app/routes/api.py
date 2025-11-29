from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.models import User, Student, Admin, StudyProgram, Project, Evaluation, EvaluationMark, UserRole, ProjectLevel, Deadline, EvaluationType, ProjectStatus
from marshmallow import Schema, fields, ValidationError
from sqlalchemy import func, desc
from sqlalchemy.orm import joinedload
from functools import wraps
from datetime import datetime, time
import csv
from io import StringIO, BytesIO
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.utils import simpleSplit

api_bp = Blueprint('api', __name__)

# Handle OPTIONS requests for CORS preflight (Flask-CORS should handle this, but this ensures it works)
@api_bp.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response()
        # Get CORS origins from config
        from flask import current_app
        cors_origins = current_app.config.get("CORS_ORIGINS", "http://localhost:3000")
        if isinstance(cors_origins, str) and ',' in cors_origins:
            cors_origins = [origin.strip() for origin in cors_origins.split(',')]
        elif isinstance(cors_origins, str):
            cors_origins = [cors_origins]
        
        origin = request.headers.get('Origin')
        if origin in cors_origins or '*' in cors_origins:
            response.headers.add("Access-Control-Allow-Origin", origin or cors_origins[0] if cors_origins else "*")
        response.headers.add('Access-Control-Allow-Headers', "Content-Type, Authorization")
        response.headers.add('Access-Control-Allow-Methods', "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        response.headers.add('Access-Control-Allow-Credentials', "true")
        return response
class UserSchema(Schema):
    name = fields.Str(required=True, min_length=2, max_length=100)
    email = fields.Email(required=True)
    password = fields.Str(required=True, min_length=6)
    role = fields.Str(required=True, validate=lambda x: x in ['ADMIN', 'STUDENT'])
    registration_number = fields.Str(allow_none=True, missing=None)

class CourseSchema(Schema):
    code = fields.Str(required=True, min_length=2, max_length=20)
    name = fields.Str(required=True, min_length=2, max_length=200)
    description = fields.Str(allow_none=True)

class ProjectSchema(Schema):
    title = fields.Str(required=True, min_length=2, max_length=200)
    description = fields.Str(allow_none=True)
    level = fields.Int(required=True, validate=lambda x: x in [200, 400])
    course_id = fields.Int(required=True)
    student_id = fields.Int(required=True)

class EvaluationSchema(Schema):
    evaluation_type = fields.Str(required=True, validate=lambda x: x in ['PROJECT', 'PRESENTATION'])
    comments = fields.Str(allow_none=True)
    marks = fields.List(fields.Dict(), required=True)

course_schema = CourseSchema()
project_schema = ProjectSchema()
evaluation_schema = EvaluationSchema()
user_schema = UserSchema()

def require_admin_role():
    """Decorator to require admin role"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_id_str = get_jwt_identity()
            if not user_id_str:
                return jsonify({"error": "Authentication required"}), 401
            
            try:
                user_id = int(user_id_str)
            except (ValueError, TypeError):
                return jsonify({"error": "Invalid token"}), 401
            
            user = User.query.get(user_id)
            if not user or user.role != UserRole.ADMIN:
                return jsonify({"error": "Admin access required"}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def _parse_date_param(value):
    if not value:
        return None
    try:
        if len(value) == 10:
            return datetime.strptime(value, '%Y-%m-%d')
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError as exc:
        raise ValueError("Invalid date format. Use YYYY-MM-DD or ISO 8601.") from exc


def _normalize_end_of_day(date_value):
    if not date_value:
        return None
    if date_value.time() == time(0, 0):
        return datetime.combine(date_value.date(), time(23, 59, 59))
    return date_value


def _build_report_summary(level_param=None, start_date_str=None, end_date_str=None):
    level = None
    if level_param:
        try:
            level = ProjectLevel(int(level_param))
        except ValueError as exc:
            raise ValueError("Invalid level parameter. Accepted values: 200 or 400.") from exc

    start_date = _parse_date_param(start_date_str) if start_date_str else None
    end_date = _parse_date_param(end_date_str) if end_date_str else None
    if end_date:
        end_date = _normalize_end_of_day(end_date)

    if start_date and end_date and end_date < start_date:
        raise ValueError("end_date must be greater than or equal to start_date.")

    project_query = Project.query
    if level:
        project_query = project_query.filter(Project.level == level)
    if start_date:
        project_query = project_query.filter(Project.created_at >= start_date)
    if end_date:
        project_query = project_query.filter(Project.created_at <= end_date)

    total_projects = project_query.count()
    evaluated_projects = project_query.join(Evaluation).distinct(Project.id).count()
    pending_projects = project_query.filter(Project.status == ProjectStatus.DRAFT).count()
    completed_projects = project_query.filter(Project.status == ProjectStatus.EVALUATED).count()
    status_rows = project_query.with_entities(Project.status, func.count(Project.id)).group_by(Project.status).all()
    status_breakdown = {status.value if isinstance(status, ProjectStatus) else str(status): count for status, count in status_rows}

    evaluation_query = Evaluation.query.join(Project)
    if level:
        evaluation_query = evaluation_query.filter(Project.level == level)
    if start_date:
        evaluation_query = evaluation_query.filter(Evaluation.created_at >= start_date)
    if end_date:
        evaluation_query = evaluation_query.filter(Evaluation.created_at <= end_date)

    evaluation_count = evaluation_query.count()
    average_score = evaluation_query.with_entities(func.avg(Evaluation.total_score)).scalar() or 0

    grade_rows = evaluation_query.with_entities(Evaluation.grade, func.count(Evaluation.id))\
        .filter(Evaluation.grade.isnot(None))\
        .group_by(Evaluation.grade).all()
    grade_distribution = [
        {
            "grade": grade,
            "count": count
        } for grade, count in grade_rows
    ]

    study_program_query = db.session.query(
        StudyProgram.name.label('study_program_name'),
        Project.level,
        func.count(Project.id).label('project_count'),
        func.avg(Evaluation.total_score).label('average_score')
    ).join(Project, StudyProgram.id == Project.study_program_id).outerjoin(Evaluation, Evaluation.project_id == Project.id)

    if level:
        study_program_query = study_program_query.filter(Project.level == level)
    if start_date:
        study_program_query = study_program_query.filter(Project.created_at >= start_date)
    if end_date:
        study_program_query = study_program_query.filter(Project.created_at <= end_date)

    study_program_rows = study_program_query.group_by(StudyProgram.id, Project.level).all()
    study_programs = [{
        "study_program_name": row.study_program_name,
        "level": row.level.value if isinstance(row.level, ProjectLevel) else row.level,
        "project_count": row.project_count,
        "average_score": round(row.average_score, 2) if row.average_score is not None else None
    } for row in study_program_rows]

    top_projects_query = db.session.query(
        Project.title,
        Project.level,
        func.avg(Evaluation.total_score).label('avg_score')
    ).join(Evaluation)

    if level:
        top_projects_query = top_projects_query.filter(Project.level == level)
    if start_date:
        top_projects_query = top_projects_query.filter(Evaluation.created_at >= start_date)
    if end_date:
        top_projects_query = top_projects_query.filter(Evaluation.created_at <= end_date)

    top_projects_rows = top_projects_query.group_by(Project.id).order_by(desc('avg_score')).limit(10).all()
    top_projects = [{
        "title": row.title,
        "level": row.level.value if isinstance(row.level, ProjectLevel) else row.level,
        "average_score": round(row.avg_score, 2) if row.avg_score is not None else None
    } for row in top_projects_rows]

    recent_activity_rows = evaluation_query.with_entities(
        Evaluation.id,
        Project.title,
        Evaluation.total_score,
        Evaluation.created_at,
        User.name
    ).join(User, Evaluation.admin_id == User.id).order_by(Evaluation.created_at.desc()).limit(6).all()

    recent_activity = [{
        "id": row.id,
        "project_title": row.title,
        "score": row.total_score,
        "evaluated_by": row.name,
        "timestamp": row.created_at.isoformat()
    } for row in recent_activity_rows]

    completion_rate = round((evaluated_projects / total_projects * 100), 2) if total_projects else 0

    return {
        "meta": {
            "generated_at": datetime.utcnow().isoformat(),
            "filters": {
                "level": level.value if level else None,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            }
        },
        "project_overview": {
            "total_projects": total_projects,
            "evaluated_projects": evaluated_projects,
            "pending_projects": pending_projects,
            "completed_projects": completed_projects,
            "completion_rate": completion_rate,
            "status_breakdown": status_breakdown
        },
        "performance": {
            "average_score": round(average_score, 2),
            "evaluation_count": evaluation_count,
            "grade_distribution": grade_distribution
        },
        "study_programs": study_programs,
        "top_projects": top_projects,
        "recent_activity": recent_activity
    }


def _report_summary_to_csv(summary):
    output = StringIO()
    writer = csv.writer(output)

    meta = summary.get("meta", {})
    writer.writerow(["Evaluation Report"])
    writer.writerow(["Generated At", meta.get("generated_at")])
    writer.writerow(["Level", meta.get("filters", {}).get("level") or "All"])
    writer.writerow(["Start Date", meta.get("filters", {}).get("start_date") or "Not specified"])
    writer.writerow(["End Date", meta.get("filters", {}).get("end_date") or "Not specified"])
    writer.writerow([])

    overview = summary.get("project_overview", {})
    writer.writerow(["Project Overview"])
    writer.writerow(["Total Projects", overview.get("total_projects", 0)])
    writer.writerow(["Evaluated Projects", overview.get("evaluated_projects", 0)])
    writer.writerow(["Pending Projects", overview.get("pending_projects", 0)])
    writer.writerow(["Completed Projects", overview.get("completed_projects", 0)])
    writer.writerow(["Completion Rate (%)", overview.get("completion_rate", 0)])
    writer.writerow([])

    performance = summary.get("performance", {})
    writer.writerow(["Performance"])
    writer.writerow(["Average Score", performance.get("average_score", 0)])
    writer.writerow(["Evaluation Count", performance.get("evaluation_count", 0)])
    writer.writerow([])
    writer.writerow(["Grade Distribution"])
    writer.writerow(["Grade", "Count"])
    for grade_row in performance.get("grade_distribution", []):
        writer.writerow([grade_row.get("grade"), grade_row.get("count")])
    writer.writerow([])

    writer.writerow(["Study Program Breakdown"])
    writer.writerow(["Study Program", "Projects", "Average Score"])
    for program in summary.get("study_programs", []):
        writer.writerow([
            program.get("study_program_name"),
            program.get("project_count"),
            program.get("average_score") if program.get("average_score") is not None else ""
        ])
    writer.writerow([])

    writer.writerow(["Top Projects"])
    writer.writerow(["Title", "Level", "Average Score"])
    for project in summary.get("top_projects", []):
        writer.writerow([
            project.get("title"),
            project.get("level"),
            project.get("average_score")
        ])
    writer.writerow([])

    writer.writerow(["Recent Activity"])
    writer.writerow(["Project", "Score", "Evaluator", "Timestamp"])
    for activity in summary.get("recent_activity", []):
        writer.writerow([
            activity.get("project_title"),
            activity.get("score"),
            activity.get("evaluated_by"),
            activity.get("timestamp")
        ])

    return output.getvalue()


def _report_summary_to_pdf(summary):
    buffer = BytesIO()
    pdf = Canvas(buffer, pagesize=LETTER)
    width, height = LETTER
    margin = 40
    line_height = 14
    y = height - margin

    def ensure_space():
        nonlocal y
        if y <= margin:
            pdf.showPage()
            pdf.setFont("Helvetica", 10)
            y = height - margin

    def draw_heading(text, size=14):
        nonlocal y
        pdf.setFont("Helvetica-Bold", size)
        pdf.drawString(margin, y, text)
        y -= line_height + 4
        ensure_space()
        pdf.setFont("Helvetica", 10)

    def draw_label_value(label, value):
        nonlocal y
        ensure_space()
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(margin, y, f"{label}:")
        pdf.setFont("Helvetica", 10)
        pdf.drawString(margin + 120, y, str(value))
        y -= line_height

    def draw_list(items, label_fields):
        nonlocal y
        for item in items:
            ensure_space()
            line = " • " + " | ".join(f"{label}: {item.get(field, '')}" for label, field in label_fields)
            lines = simpleSplit(line, "Helvetica", 10, width - (margin * 2))
            for part in lines:
                pdf.drawString(margin, y, part)
                y -= line_height
                ensure_space()

    draw_heading("Evaluation Summary Report")

    meta = summary.get("meta", {})
    filters = meta.get("filters", {})
    draw_label_value("Generated At", meta.get("generated_at", ""))
    draw_label_value("Level", filters.get("level") or "All")
    draw_label_value("Start Date", filters.get("start_date") or "—")
    draw_label_value("End Date", filters.get("end_date") or "—")
    y -= line_height

    draw_heading("Project Overview", 12)
    overview = summary.get("project_overview", {})
    draw_label_value("Total Projects", overview.get("total_projects", 0))
    draw_label_value("Evaluated Projects", overview.get("evaluated_projects", 0))
    draw_label_value("Pending Projects", overview.get("pending_projects", 0))
    draw_label_value("Completed Projects", overview.get("completed_projects", 0))
    draw_label_value("Completion Rate (%)", overview.get("completion_rate", 0))

    if overview.get("status_breakdown"):
        y -= line_height
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(margin, y, "Status Breakdown:")
        y -= line_height
        pdf.setFont("Helvetica", 10)
        for status, count in overview["status_breakdown"].items():
            ensure_space()
            pdf.drawString(margin + 10, y, f"{status.title()}: {count}")
            y -= line_height

    y -= line_height
    draw_heading("Performance", 12)
    performance = summary.get("performance", {})
    draw_label_value("Average Score", performance.get("average_score", 0))
    draw_label_value("Evaluation Count", performance.get("evaluation_count", 0))

    if performance.get("grade_distribution"):
        y -= line_height
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(margin, y, "Grade Distribution:")
        y -= line_height
        pdf.setFont("Helvetica", 10)
        for grade in performance["grade_distribution"]:
            ensure_space()
            pdf.drawString(margin + 10, y, f"{grade.get('grade')}: {grade.get('count')}")
            y -= line_height

    if summary.get("study_programs"):
        y -= line_height
        draw_heading("Study Program Performance", 12)
        pdf.setFont("Helvetica", 10)
        draw_list(
            summary["study_programs"],
            [
                ("Program", "study_program_name"),
                ("Projects", "project_count"),
                ("Avg Score", "average_score"),
            ],
        )

    if summary.get("top_projects"):
        y -= line_height
        draw_heading("Top Projects", 12)
        pdf.setFont("Helvetica", 10)
        draw_list(
            summary["top_projects"],
            [
                ("Title", "title"),
                ("Level", "level"),
                ("Avg Score", "average_score"),
            ],
        )

    if summary.get("recent_activity"):
        y -= line_height
        draw_heading("Recent Activity", 12)
        pdf.setFont("Helvetica", 10)
        for activity in summary["recent_activity"]:
            ensure_space()
            pdf.drawString(
                margin,
                y,
                f"{activity.get('project_title')} • {activity.get('evaluated_by')} • {activity.get('score')}%",
            )
            y -= line_height
            timestamp_text = activity.get('timestamp', '')
            if timestamp_text:
                pdf.drawString(margin + 10, y, timestamp_text)
                y -= line_height

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.getvalue()

# Study Programs Routes
@api_bp.route('/study-programs', methods=['GET'])
@jwt_required()
def get_courses():
    courses = StudyProgram.query.all()
    return jsonify([{
        'id': course.id,
        'code': course.code,
        'name': course.name,
        'description': course.description,
        'created_at': course.created_at.isoformat(),
        'project_count': course.projects.count()
    } for course in courses]), 200

@api_bp.route('/study-programs', methods=['POST'])
@jwt_required()
@require_admin_role()
def create_course():
    try:
        data = course_schema.load(request.json)
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400
    
    # Validate study program code format: 2-3 letters followed by 200 or 400
    import re
    code = data['code'].upper().strip()
    if not re.match(r'^[A-Z]{2,3}(200|400)$', code):
        return jsonify({"error": "Study program code must be 2-3 letters followed by 200 or 400 (e.g., ISA200, CS400)"}), 400
    
    data['code'] = code
    
    # Check if course code already exists
    if StudyProgram.query.filter_by(code=data['code']).first():
        return jsonify({"error": "Course with this code already exists"}), 409
    
    course = StudyProgram(**data)
    db.session.add(course)
    db.session.commit()
    
    return jsonify({
        'id': course.id,
        'code': course.code,
        'name': course.name,
        'description': course.description,
        'created_at': course.created_at.isoformat()
    }), 201

@api_bp.route('/study-programs/<int:course_id>', methods=['PUT'])
@jwt_required()
@require_admin_role()
def update_course(course_id):
    try:
        course = StudyProgram.query.get_or_404(course_id)
        data = course_schema.load(request.json)
        
        # Validate study program code format: 2-3 letters followed by 200 or 400
        import re
        code = data['code'].upper().strip()
        if not re.match(r'^[A-Z]{2,3}(200|400)$', code):
            return jsonify({"error": "Study program code must be 2-3 letters followed by 200 or 400 (e.g., ISA200, CS400)"}), 400
        
        data['code'] = code
        
        # Check if course code is already taken by another course
        existing_course = StudyProgram.query.filter_by(code=data['code']).first()
        if existing_course and existing_course.id != course_id:
            return jsonify({"error": "Study program code already taken by another study program"}), 400
        
        # Update course fields
        course.code = data['code']
        course.name = data['name']
        course.description = data.get('description', course.description)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Study program updated successfully',
            'course': {
                'id': course.id,
                'code': course.code,
                'name': course.name,
                'description': course.description,
                'created_at': course.created_at.isoformat()
            }
        }), 200
        
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update study program"}), 500

@api_bp.route('/study-programs/<int:course_id>', methods=['DELETE'])
@jwt_required()
@require_admin_role()
def delete_course(course_id):
    try:
        course = StudyProgram.query.get_or_404(course_id)
        
        # Check if course has projects
        projects = Project.query.filter_by(study_program_id=course_id).all()
        if projects:
            return jsonify({"error": "Cannot delete study program with existing projects"}), 400
        
        db.session.delete(course)
        db.session.commit()
        
        return jsonify({"message": "Study program deleted successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete study program"}), 500

# Evaluation Templates Route (must be before other evaluation routes)
@api_bp.route('/evaluation-templates', methods=['GET'])
@jwt_required()
def get_evaluation_templates():
    """Get available evaluation templates with their criteria"""
    templates = {
        'project': {
            'name': 'Project Evaluation',
            'description': 'Evaluation of project work: Code Quality, Documentation, and Functionality',
            'evaluation_type': 'PROJECT',
            'criteria': [
                {'criterion_name': 'Code Quality', 'max_score': 20, 'description': 'Code structure, organization, and adherence to best practices'},
                {'criterion_name': 'Documentation', 'max_score': 20, 'description': 'Completeness and clarity of documentation'},
                {'criterion_name': 'Functionality', 'max_score': 30, 'description': 'How well the project meets functional requirements'}
            ]
        },
        'presentation': {
            'name': 'Presentation Evaluation',
            'description': 'Evaluation of presentation: Clarity & Communication, Visual Presentation, and Technical Explanation',
            'evaluation_type': 'PRESENTATION',
            'criteria': [
                {'criterion_name': 'Clarity & Communication', 'max_score': 10, 'description': 'Clear communication of ideas and concepts'},
                {'criterion_name': 'Visual Presentation', 'max_score': 10, 'description': 'Quality of visual materials and slides'},
                {'criterion_name': 'Technical Explanation', 'max_score': 10, 'description': 'Ability to explain technical aspects clearly'}
            ]
        }
    }
    
    return jsonify(templates), 200

# Projects Routes
@api_bp.route('/projects', methods=['GET'])
@jwt_required()
@require_admin_role()
def get_projects():
    try:
        # Get query parameters for filtering and search
        search = request.args.get('search', '')
        status = request.args.get('status', '')
        level = request.args.get('level', '')
        study_program_id = request.args.get('study_program_id', '')
        # Backward compatibility: accept legacy 'course_id'
        legacy_course_id = request.args.get('course_id', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        
        # Build query
        query = Project.query
        
        # Apply filters
        if search:
            query = query.filter(
                Project.title.contains(search) |
                Project.description.contains(search)
            )
        
        if status:
            try:
                status_enum = ProjectStatus(status)
                query = query.filter(Project.status == status_enum)
            except ValueError:
                # Fallback to string comparison for backward compatibility
                query = query.filter(Project.status == status)
        
        if level:
            query = query.filter(Project.level == int(level))
        
        # Prefer new study_program_id, fallback to legacy param
        selected_sp_id = study_program_id or legacy_course_id
        if selected_sp_id:
            query = query.filter(Project.study_program_id == int(selected_sp_id))
        
        # Get paginated results
        projects = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'projects': [project.to_dict() for project in projects.items],
            'total': projects.total,
            'pages': projects.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in get_projects: {str(e)}")
        print(error_details)
        return jsonify({"error": "Failed to fetch projects", "details": str(e)}), 500

@api_bp.route('/projects', methods=['POST'])
@jwt_required()
@require_admin_role()
def create_project():
    """Admin-only endpoint to create projects (for backward compatibility)"""
    try:
        data = project_schema.load(request.json)
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400
    
    # Validate study program and student exist (accept legacy field name 'course_id')
    study_program_id = data.get('study_program_id', data.get('course_id'))
    course = StudyProgram.query.get(study_program_id)
    if not course:
        return jsonify({"error": "Study program not found"}), 404
    
    student = User.query.get(data['student_id'])
    if not student or student.role != UserRole.STUDENT:
        return jsonify({"error": "Student not found"}), 404
    
    data['level'] = ProjectLevel(data['level'])
    project = Project(**data)
    db.session.add(project)
    db.session.commit()
    
    return jsonify(project.to_dict()), 201

@api_bp.route('/students/me/project', methods=['POST'])
@jwt_required()
def create_my_project():
    """Allow students to create their own project"""
    try:
        current_user, student = get_current_student()
        
        if not current_user or not student:
            return jsonify({"error": "Access denied"}), 403
        
        # Check if student already has a project (one-to-one relationship)
        existing_project = Project.query.filter_by(student_id=student.id).first()
        if existing_project:
            return jsonify({"error": "You already have a project. Each student can only have one project."}), 400
        
        # Get request data
        data = request.json
        if not data:
            return jsonify({"error": "Request body is required"}), 400
        
        # Validate required fields
        title = data.get('title', '').strip()
        if not title or len(title) < 2:
            return jsonify({"error": "Project title is required (minimum 2 characters)"}), 400
        
        study_program_id = data.get('study_program_id')
        if not study_program_id:
            return jsonify({"error": "Study program is required"}), 400
        
        level = data.get('level')
        if level not in [200, 400]:
            return jsonify({"error": "Level must be 200 or 400"}), 400
        
        # Validate study program exists
        study_program = StudyProgram.query.get(study_program_id)
        if not study_program:
            return jsonify({"error": "Study program not found"}), 404
        
        # Create project with pending approval status
        project = Project(
            title=title,
            description=data.get('description', '').strip(),
            level=ProjectLevel(level),
            study_program_id=study_program_id,
            student_id=student.id,
            status=ProjectStatus.PENDING_APPROVAL
        )
        
        db.session.add(project)
        db.session.commit()
        
        return jsonify({
            "message": "Project created successfully",
            "project": project.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in create_my_project: {str(e)}")
        print(error_details)
        return jsonify({"error": "Failed to create project", "details": str(e)}), 500

@api_bp.route('/projects/<int:project_id>', methods=['PUT'])
@jwt_required()
@require_admin_role()
def update_project(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        data = project_schema.load(request.json)
        
        # Update project fields
        project.title = data['title']
        project.description = data.get('description', project.description)
        project.level = data['level']
        # Accept either study_program_id or legacy course_id
        project.study_program_id = data.get('study_program_id', data.get('course_id', project.study_program_id))
        project.student_id = data['student_id']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Project updated successfully',
            'project': project.to_dict()
        }), 200
        
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update project"}), 500

@api_bp.route('/projects/<int:project_id>', methods=['DELETE'])
@jwt_required()
@require_admin_role()
def delete_project(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        
        # Check if project has evaluations
        evaluations = Evaluation.query.filter_by(project_id=project_id).all()
        if evaluations:
            return jsonify({"error": "Cannot delete project with existing evaluations"}), 400
        
        db.session.delete(project)
        db.session.commit()
        
        return jsonify({"message": "Project deleted successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete project"}), 500

@api_bp.route('/projects/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        
        # Get project with related data
        project_data = project.to_dict()
        
        # Get evaluations for this project
        evaluations = Evaluation.query.filter_by(project_id=project_id).all()
        project_data['evaluations'] = [eval.to_dict() for eval in evaluations]
        
        return jsonify(project_data), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch project"}), 500

@api_bp.route('/projects/<int:project_id>/approve', methods=['POST'])
@jwt_required()
@require_admin_role()
def approve_project(project_id):
    """Admin endpoint to approve a project"""
    try:
        project = Project.query.get_or_404(project_id)
        
        # Normalize status for comparison (handle both enum and string)
        try:
            current_status = _normalize_status(project.status)
        except ValueError as e:
            return jsonify({"error": f"Invalid project status: {e}"}), 400
        
        if current_status != ProjectStatus.PENDING_APPROVAL:
            return jsonify({"error": f"Project is not pending approval. Current status: {current_status.value}"}), 400
        
        # Approve project: change status to DRAFT so student can proceed
        success, error = update_project_status(project, ProjectStatus.DRAFT)
        if not success:
            db.session.rollback()
            return jsonify({"error": f"Failed to approve project: {error}"}), 500
        
        db.session.commit()
        
        return jsonify({
            "message": "Project approved successfully",
            "project": project.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in approve_project: {str(e)}")
        print(error_details)
        return jsonify({"error": "Failed to approve project", "details": str(e)}), 500

@api_bp.route('/projects/<int:project_id>/reject', methods=['POST'])
@jwt_required()
@require_admin_role()
def reject_project(project_id):
    """Admin endpoint to reject a project"""
    try:
        project = Project.query.get_or_404(project_id)
        
        # Normalize status for comparison (handle both enum and string)
        try:
            current_status = _normalize_status(project.status)
        except ValueError as e:
            return jsonify({"error": f"Invalid project status: {e}"}), 400
        
        if current_status != ProjectStatus.PENDING_APPROVAL:
            return jsonify({"error": f"Project is not pending approval. Current status: {current_status.value}"}), 400
        
        # Get rejection reason from request (optional)
        data = request.json or {}
        rejection_reason = data.get('reason', '').strip()
        
        # Reject project: change status to REJECTED
        success, error = update_project_status(project, ProjectStatus.REJECTED)
        if not success:
            db.session.rollback()
            return jsonify({"error": f"Failed to reject project: {error}"}), 500
        
        # Store rejection reason in description if provided (or could add a separate field)
        if rejection_reason:
            project.description = (project.description or '') + f"\n\n[Rejection Reason: {rejection_reason}]"
        
        db.session.commit()
        
        return jsonify({
            "message": "Project rejected successfully",
            "project": project.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to reject project", "details": str(e)}), 500

# Evaluations Routes
@api_bp.route('/projects/<int:project_id>/evaluations', methods=['GET'])
@jwt_required()
def get_project_evaluations(project_id):
    project = Project.query.get_or_404(project_id)
    evaluations = Evaluation.query.filter_by(project_id=project_id).all()
    
    # Separate evaluations by type
    project_eval = next((e for e in evaluations if e.evaluation_type == EvaluationType.PROJECT), None)
    presentation_eval = next((e for e in evaluations if e.evaluation_type == EvaluationType.PRESENTATION), None)
    
    result = {
        'project_evaluation': project_eval.to_dict() if project_eval else None,
        'presentation_evaluation': presentation_eval.to_dict() if presentation_eval else None,
        'all_evaluations': [evaluation.to_dict() for evaluation in evaluations]
    }
    
    return jsonify(result), 200

@api_bp.route('/projects/<int:project_id>/evaluations', methods=['POST'])
@jwt_required()
@require_admin_role()
def create_evaluation(project_id):
    project = Project.query.get_or_404(project_id)
    
    try:
        data = evaluation_schema.load(request.json)
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400
    
    identity = get_jwt_identity()
    evaluation_type = EvaluationType(data['evaluation_type'])
    
    # Check if evaluation of this type already exists for this project
    existing_evaluation = Evaluation.query.filter_by(
        project_id=project_id,
        evaluation_type=evaluation_type
    ).first()
    
    if existing_evaluation:
        return jsonify({
            "error": f"{evaluation_type.value} evaluation already exists for this project. Use PATCH to update it."
        }), 400
    
    # Calculate scores based on evaluation type
    total_score = 0
    total_max_score = 0
    code_quality = None
    documentation_score = None
    functionality_score = None
    clarity_communication = None
    visual_presentation = None
    technical_explanation = None
    
    # Process marks and extract scores based on type
    for mark_data in data['marks']:
        criterion_name = mark_data['criterion_name'].lower()
        score = float(mark_data['score'])
        max_score = float(mark_data['max_score'])
        
        total_score += score
        total_max_score += max_score
        
        # Map marks to specific fields based on evaluation type
        if evaluation_type == EvaluationType.PROJECT:
            if 'code quality' in criterion_name:
                code_quality = score if code_quality is None else code_quality + score
            elif 'documentation' in criterion_name:
                documentation_score = score if documentation_score is None else documentation_score + score
            elif 'functionality' in criterion_name:
                functionality_score = score if functionality_score is None else functionality_score + score
        elif evaluation_type == EvaluationType.PRESENTATION:
            if 'clarity' in criterion_name or 'communication' in criterion_name:
                clarity_communication = score if clarity_communication is None else clarity_communication + score
            elif 'visual' in criterion_name or ('presentation' in criterion_name and 'visual' not in criterion_name):
                visual_presentation = score if visual_presentation is None else visual_presentation + score
            elif 'technical' in criterion_name or 'explanation' in criterion_name:
                technical_explanation = score if technical_explanation is None else technical_explanation + score
    
    # Calculate totals
    total_project_marks = 0
    total_presentation_marks = 0
    
    if evaluation_type == EvaluationType.PROJECT:
        total_project_marks = total_score
        code_quality = code_quality or 0
        documentation_score = documentation_score or 0
        functionality_score = functionality_score or 0
    elif evaluation_type == EvaluationType.PRESENTATION:
        total_presentation_marks = total_score
        clarity_communication = clarity_communication or 0
        visual_presentation = visual_presentation or 0
        technical_explanation = technical_explanation or 0
    
    # Calculate percentage
    percentage = round((total_score / total_max_score) * 100, 2) if total_max_score > 0 else 0.0
    
    # Create evaluation
    evaluation = Evaluation(
        project_id=project_id,
        admin_id=int(identity),
        evaluation_type=evaluation_type,
        total_score=percentage,
        code_quality=code_quality,
        documentation_score=documentation_score,
        functionality_score=functionality_score,
        clarity_communication=clarity_communication,
        visual_presentation=visual_presentation,
        technical_explanation=technical_explanation,
        total_project_marks=total_project_marks,
        total_presentation_marks=total_presentation_marks,
        comments=data.get('comments')
    )
    db.session.add(evaluation)
    db.session.flush()  # Get evaluation ID
    
    # Create marks
    for mark_data in data['marks']:
        mark = EvaluationMark(
            evaluation_id=evaluation.id,
            criterion_name=mark_data['criterion_name'],
            max_score=float(mark_data['max_score']),
            score=float(mark_data['score']),
            comments=mark_data.get('comments')
        )
        db.session.add(mark)
    
    # Calculate overall percentage and grade for the project (combining both evaluations if they exist)
    project_evaluations = Evaluation.query.filter_by(project_id=project_id).all()
    project_eval = next((e for e in project_evaluations if e.evaluation_type == EvaluationType.PROJECT), None)
    presentation_eval = next((e for e in project_evaluations if e.evaluation_type == EvaluationType.PRESENTATION), None)
    
    if project_eval and presentation_eval:
        total_marks = (project_eval.total_project_marks or 0) + (presentation_eval.total_presentation_marks or 0)
        # Total possible marks: 70 (project) + 30 (presentation) = 100
        overall_percentage = round((total_marks / 100) * 100, 2) if total_marks else 0
        
        # Determine grade
        grade = 'F'
        if overall_percentage >= 90:
            grade = 'A'
        elif overall_percentage >= 80:
            grade = 'B'
        elif overall_percentage >= 70:
            grade = 'C'
        elif overall_percentage >= 60:
            grade = 'D'
        
        # Update both evaluations with overall percentage and grade
        project_eval.overall_percentage = overall_percentage
        project_eval.grade = grade
        presentation_eval.overall_percentage = overall_percentage
        presentation_eval.grade = grade
        
        # Automatic status transition: both evaluations exist -> EVALUATED
        success, error = update_project_status(project, ProjectStatus.EVALUATED)
        if not success:
            # Log error but don't fail the request
            print(f"Warning: Could not update project status: {error}")
    else:
        # First evaluation created -> transition to UNDER_REVIEW
        if project.status == ProjectStatus.SUBMITTED:
            success, error = update_project_status(project, ProjectStatus.UNDER_REVIEW)
            if not success:
                print(f"Warning: Could not update project status: {error}")
    
    db.session.commit()
    return jsonify(evaluation.to_dict()), 201

@api_bp.route('/evaluations/<int:evaluation_id>', methods=['PATCH'])
@jwt_required()
@require_admin_role()
def update_evaluation(evaluation_id):
    evaluation = Evaluation.query.get_or_404(evaluation_id)
    
    data = request.json
    if 'comments' in data:
        evaluation.comments = data['comments']
    
    # Update marks if provided
    if 'marks' in data:
        # Delete existing marks
        EvaluationMark.query.filter_by(evaluation_id=evaluation_id).delete()
        
        # Create new marks
        total_score = 0
        total_max_score = 0
        
        for mark_data in data['marks']:
            mark = EvaluationMark(
                evaluation_id=evaluation.id,
                criterion_name=mark_data['criterion_name'],
                max_score=mark_data['max_score'],
                score=mark_data['score'],
                comments=mark_data.get('comments')
            )
            db.session.add(mark)
            total_score += mark_data['score']
            total_max_score += mark_data['max_score']
        
        # Recalculate total score
        if total_max_score > 0:
            evaluation.total_score = round((total_score / total_max_score) * 100, 2)
    
    db.session.commit()
    return jsonify(evaluation.to_dict()), 200

# User Management Routes (Admin Only)
@api_bp.route('/users', methods=['GET'])
@jwt_required()
@require_admin_role()
def get_users():
    try:
        users = User.query.all()
        return jsonify([user.to_dict() for user in users]), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch users"}), 500

@api_bp.route('/users', methods=['POST'])
@jwt_required()
@require_admin_role()
def create_user():
    try:
        data = user_schema.load(request.json)
        
        # Normalize email to lowercase
        data['email'] = data['email'].lower().strip()
        
        # Validate email domain
        if not data['email'].endswith('@hit.ac.zw'):
            return jsonify({"error": "Email must be a valid HIT email address (@hit.ac.zw)"}), 400
        
        # Normalize registration_number: convert empty strings to None
        if 'registration_number' in data:
            reg_num = data.get('registration_number')
            if reg_num is not None and isinstance(reg_num, str) and not reg_num.strip():
                data['registration_number'] = None
        
        # Validate: registration_number is required for STUDENT role
        if data['role'] == 'STUDENT':
            registration_number = data.get('registration_number')
            if not registration_number or (isinstance(registration_number, str) and not registration_number.strip()):
                return jsonify({"error": "Registration number is required for students"}), 400
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            return jsonify({"error": "User with this email already exists"}), 400
        
        # Create new user
        user = User(
            name=data['name'],
            email=data['email'],
            role=UserRole.ADMIN if data['role'] == 'ADMIN' else UserRole.STUDENT
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.flush()  # Get the user ID
        
        # Create student profile if role is STUDENT
        if data['role'] == 'STUDENT':
            registration_number = data.get('registration_number')
            if not registration_number or not registration_number.strip():
                db.session.rollback()
                return jsonify({"error": "Registration number is required for students"}), 400
            student_profile = Student(user_id=user.id, student_id=registration_number.strip())
            db.session.add(student_profile)
        
        # Create admin profile if role is ADMIN
        elif data['role'] == 'ADMIN':
            admin_profile = Admin(user_id=user.id, department='Administration')
            db.session.add(admin_profile)
        
        db.session.commit()
        
        return jsonify({
            'message': 'User created successfully',
            'user': user.to_dict()
        }), 201
        
    except ValidationError as err:
        return jsonify({"error": "Validation error", "details": err.messages}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create user", "details": str(e)}), 500

@api_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@require_admin_role()
def update_user(user_id):
    try:
        user = User.query.get_or_404(user_id)
        data = request.json
        
        # Store original role before any changes
        original_role = user.role
        
        # Determine new role (if changing)
        new_role = None
        if 'role' in data:
            new_role = UserRole.ADMIN if data['role'] == 'ADMIN' else UserRole.STUDENT
        
        # Update user fields
        if 'name' in data:
            user.name = data['name']
        if 'email' in data:
            # Normalize email to lowercase
            email = data['email'].lower().strip()
            
            # Validate email domain
            if not email.endswith('@hit.ac.zw'):
                return jsonify({"error": "Email must be a valid HIT email address (@hit.ac.zw)"}), 400
            
            # Check if email is already taken by another user
            existing_user = User.query.filter_by(email=email).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({"error": "Email already taken by another user"}), 400
            
            user.email = email
            user.email = data['email']
        if 'password' in data and data['password']:
            # Update password if provided
            user.set_password(data['password'])
        
        # Handle role change and profile management
        if new_role and new_role != original_role:
            # Role is being changed
            if original_role == UserRole.STUDENT and new_role == UserRole.ADMIN:
                # Remove student profile if changing from STUDENT to ADMIN
                student_profile = Student.query.filter_by(user_id=user_id).first()
                if student_profile:
                    db.session.delete(student_profile)
                # Create admin profile if it doesn't exist
                admin_profile = Admin.query.filter_by(user_id=user_id).first()
                if not admin_profile:
                    admin_profile = Admin(user_id=user.id, department='Administration')
                    db.session.add(admin_profile)
            elif original_role == UserRole.ADMIN and new_role == UserRole.STUDENT:
                # Remove admin profile if changing from ADMIN to STUDENT
                admin_profile = Admin.query.filter_by(user_id=user_id).first()
                if admin_profile:
                    db.session.delete(admin_profile)
                # Registration number is required when changing to STUDENT
                registration_number = data.get('registration_number')
                if not registration_number or (isinstance(registration_number, str) and not registration_number.strip()):
                    return jsonify({"error": "Registration number is required when changing role to STUDENT"}), 400
                registration_number = registration_number.strip() if isinstance(registration_number, str) else registration_number
                
                # Check if registration number is already taken
                existing_student = Student.query.filter_by(student_id=registration_number).first()
                if existing_student:
                    return jsonify({"error": "Registration number already taken by another student"}), 400
                
                # Create student profile with registration number
                student_profile = Student.query.filter_by(user_id=user_id).first()
                if not student_profile:
                    student_profile = Student(user_id=user.id, student_id=registration_number)
                    db.session.add(student_profile)
                else:
                    student_profile.student_id = registration_number
            user.role = new_role
        
        # Handle registration_number (student profile)
        # Determine if user should have student profile (after role update)
        target_role = new_role if new_role else original_role
        
        if target_role == UserRole.STUDENT:
            # Registration number is required for students
            if 'registration_number' in data:
                registration_number = data['registration_number']
                # Normalize: convert empty strings to None
                if registration_number is not None and isinstance(registration_number, str):
                    registration_number = registration_number.strip() if registration_number.strip() else None
                
                if not registration_number:
                    return jsonify({"error": "Registration number is required for students"}), 400
                
                # Check if registration number is already taken by another student
                existing_student = Student.query.filter_by(student_id=registration_number).first()
                if existing_student and existing_student.user_id != user_id:
                    return jsonify({"error": "Registration number already taken by another student"}), 400
                
                # Create or update student profile
                student_profile = Student.query.filter_by(user_id=user_id).first()
                if not student_profile:
                    # Create new student profile
                    student_profile = Student(user_id=user.id, student_id=registration_number)
                    db.session.add(student_profile)
                else:
                    student_profile.student_id = registration_number
            else:
                # If registration_number not provided, check if student already has one
                student_profile = Student.query.filter_by(user_id=user_id).first()
                if not student_profile or not student_profile.student_id:
                    return jsonify({"error": "Registration number is required for students"}), 400
        
        db.session.commit()
        
        # Re-query user to get fresh instance with relationships loaded
        updated_user = User.query.options(
            joinedload(User.student_profile),
            joinedload(User.admin_profile)
        ).get(user_id)
        
        if not updated_user:
            return jsonify({"error": "User not found after update"}), 404
        
        return jsonify({
            'message': 'User updated successfully',
            'user': updated_user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        error_details = traceback.format_exc()
        print(f"Error updating user: {error_details}")  # Log for debugging
        return jsonify({"error": "Failed to update user", "details": str(e)}), 500

@api_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@require_admin_role()
def delete_user(user_id):
    try:
        user = User.query.get_or_404(user_id)
        
        # Check if user has projects (through student profile)
        if user.student_profile:
            student_id = user.student_profile.id
            project_count = Project.query.filter_by(student_id=student_id).count()
            if project_count > 0:
                return jsonify({
                    "error": f"Cannot delete user with existing projects",
                    "details": f"User has {project_count} associated project(s). Please delete or reassign the projects first.",
                    "project_count": project_count
                }), 400
        
        # Check if user has evaluations
        evaluation_count = Evaluation.query.filter_by(admin_id=user_id).count()
        if evaluation_count > 0:
            return jsonify({
                "error": f"Cannot delete user with existing evaluations",
                "details": f"User has created {evaluation_count} evaluation(s). Evaluations cannot be deleted for data integrity.",
                "evaluation_count": evaluation_count
            }), 400
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({"message": "User deleted successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        error_details = traceback.format_exc()
        print(f"Error deleting user: {error_details}")  # Log for debugging
        return jsonify({"error": "Failed to delete user", "details": str(e)}), 500
@api_bp.route('/analytics/averages', methods=['GET'])
@jwt_required()
@require_admin_role()
def get_average_scores():
    # Get level from query parameter
    level_param = request.args.get('level')
    
    if level_param:
        level = ProjectLevel(int(level_param))
        # Filter by project level
        avg_score = db.session.query(
            func.avg(Evaluation.total_score)
        ).join(Project, Evaluation.project_id == Project.id).filter(
            Project.level == level
        ).scalar() or 0
        
        total_evaluations = db.session.query(func.count(Evaluation.id)).join(
            Project, Evaluation.project_id == Project.id
        ).filter(Project.level == level).scalar() or 0
    else:
        # Get all evaluations
        avg_score = db.session.query(func.avg(Evaluation.total_score)).scalar() or 0
        total_evaluations = Evaluation.query.count()
    
    return jsonify({
        'average_score': round(avg_score, 2),
        'total_evaluations': total_evaluations
    }), 200

@api_bp.route('/analytics/completion-rate', methods=['GET'])
@jwt_required()
@require_admin_role()
def get_completion_rate():
    # Get level from query parameter
    level_param = request.args.get('level')
    
    if level_param:
        level = ProjectLevel(int(level_param))
        # Filter by project level
        total_projects = Project.query.filter(Project.level == level).count()
        evaluated_projects = Project.query.filter(
            Project.level == level
        ).join(Evaluation).distinct().count()
    else:
        total_projects = Project.query.count()
        evaluated_projects = Project.query.join(Evaluation).distinct().count()
    
    completion_rate = (evaluated_projects / total_projects * 100) if total_projects > 0 else 0
    
    return jsonify({
        'completion_rate': round(completion_rate, 2),
        'total_projects': total_projects,
        'evaluated_projects': evaluated_projects
    }), 200

@api_bp.route('/analytics/performance-by-study-program', methods=['GET'])
@jwt_required()
@require_admin_role()
def get_performance_by_course():
    # Get level from query parameter
    level_param = request.args.get('level')
    
    query = db.session.query(
        StudyProgram.name,
        Project.level,
        func.avg(Evaluation.total_score).label('avg_score'),
        func.count(Evaluation.id).label('evaluation_count')
    ).select_from(StudyProgram).join(Project, StudyProgram.id == Project.study_program_id).join(
        Evaluation, Project.id == Evaluation.project_id
    )
    
    # Filter by level if provided
    if level_param:
        level = ProjectLevel(int(level_param))
        query = query.filter(Project.level == level)
    
    results = query.group_by(StudyProgram.id, Project.level).all()
    
    return jsonify([{
        'study_program_name': result.name,
        'level': result.level.value if isinstance(result.level, ProjectLevel) else result.level,
        'average_score': round(result.avg_score, 2),
        'evaluation_count': result.evaluation_count
    } for result in results]), 200

@api_bp.route('/analytics/pipeline', methods=['GET'])
@jwt_required()
@require_admin_role()
def get_pipeline_data():
    # Get level from query parameter
    level_param = request.args.get('level')
    
    query = db.session.query(
        Project.status,
        func.count(Project.id).label('count')
    )
    
    # Filter by level if provided
    if level_param:
        level = ProjectLevel(int(level_param))
        query = query.filter(Project.level == level)
    
    pipeline_data = query.group_by(Project.status).all()
    
    # Convert ProjectStatus enum to string value for JSON serialization
    # SQLAlchemy may return enum in different formats, so we handle all cases
    result = []
    for status_obj, count in pipeline_data:
        # Convert enum to string - handle all possible representations
        status_str = None
        try:
            # Method 1: If it's already a ProjectStatus enum, get its value
            if isinstance(status_obj, ProjectStatus):
                status_str = status_obj.value
            # Method 2: If it has a value attribute (enum-like object)
            elif hasattr(status_obj, 'value'):
                val = status_obj.value
                # If value is still an enum, get its value recursively
                if isinstance(val, ProjectStatus):
                    status_str = val.value
                else:
                    status_str = str(val)
            # Method 3: Try to normalize and get value
            else:
                normalized = _normalize_status(status_obj)
                status_str = normalized.value if isinstance(normalized, ProjectStatus) else str(normalized)
        except Exception:
            # Ultimate fallback: convert to string
            status_str = str(status_obj) if status_obj else ''
            # If string representation looks like enum, try to extract value
            if status_str.startswith('ProjectStatus.'):
                try:
                    enum_name = status_str.split('.')[-1]
                    status_str = ProjectStatus[enum_name].value
                except (KeyError, AttributeError):
                    pass
        
        # Ensure we have a string, not an enum
        if not isinstance(status_str, str):
            status_str = str(status_str)
        
        result.append({
            'status': status_str,
            'count': int(count) if count is not None else 0
        })
    
    return jsonify(result), 200

@api_bp.route('/analytics/top-projects', methods=['GET'])
@jwt_required()
@require_admin_role()
def get_top_projects():
    # Get level from query parameter
    level_param = request.args.get('level')
    
    query = db.session.query(
        Project.title,
        Project.level,
        func.avg(Evaluation.total_score).label('avg_score')
    ).join(Evaluation).group_by(Project.id)
    
    # Filter by level if provided
    if level_param:
        level = ProjectLevel(int(level_param))
        query = query.filter(Project.level == level)
    
    top_projects = query.order_by(desc('avg_score')).limit(10).all()
    
    return jsonify([{
        'title': project.title,
        'level': project.level.value,
        'average_score': round(project.avg_score, 2)
    } for project in top_projects]), 200


@api_bp.route('/reports/summary', methods=['GET'])
@jwt_required()
@require_admin_role()
def get_report_summary():
    level_param = request.args.get('level')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    try:
        summary = _build_report_summary(level_param, start_date, end_date)
        return jsonify(summary), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        return jsonify({"error": "Failed to generate report summary"}), 500


@api_bp.route('/reports/export', methods=['GET'])
@jwt_required()
@require_admin_role()
def export_report():
    level_param = request.args.get('level')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    export_format = (request.args.get('format') or 'csv').lower()
    try:
        summary = _build_report_summary(level_param, start_date, end_date)
        if export_format == 'csv':
            csv_payload = _report_summary_to_csv(summary)
            response = make_response(csv_payload)
            timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
            response.headers['Content-Disposition'] = f'attachment; filename=evaluation-report-{timestamp}.csv'
            response.headers['Content-Type'] = 'text/csv'
            return response
        elif export_format == 'pdf':
            pdf_payload = _report_summary_to_pdf(summary)
            response = make_response(pdf_payload)
            timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
            response.headers['Content-Disposition'] = f'attachment; filename=evaluation-report-{timestamp}.pdf'
            response.headers['Content-Type'] = 'application/pdf'
            return response
        elif export_format == 'json':
            return jsonify(summary), 200
        else:
            return jsonify({"error": "Unsupported export format. Use csv, pdf, or json."}), 400
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        return jsonify({"error": "Failed to export report"}), 500

# Deadline Management Routes
@api_bp.route('/deadlines', methods=['GET'])
def get_deadlines():
    try:
        deadlines = Deadline.query.all()
        return jsonify([deadline.to_dict() for deadline in deadlines]), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch deadlines"}), 500

@api_bp.route('/deadlines/level/<int:level>', methods=['GET'])
def get_deadline_by_level(level):
    try:
        deadline = Deadline.query.filter_by(level=ProjectLevel(level)).first()
        if deadline:
            return jsonify(deadline.to_dict()), 200
        else:
            return jsonify({"message": "No deadline set for this level"}), 404
    except Exception as e:
        return jsonify({"error": "Failed to fetch deadline"}), 500

@api_bp.route('/deadlines', methods=['POST'])
def create_deadline():
    try:
        data = request.json
        level = ProjectLevel(data['level'])
        
        # Check if deadline already exists for this level
        existing = Deadline.query.filter_by(level=level).first()
        if existing:
            # Update existing deadline
            existing.deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
            existing.updated_at = datetime.utcnow()
            db.session.commit()
            return jsonify(existing.to_dict()), 200
        
        # Create new deadline
        deadline = Deadline(
            level=level,
            deadline=datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
        )
        db.session.add(deadline)
        db.session.commit()
        return jsonify(deadline.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create deadline"}), 500

@api_bp.route('/deadlines/<int:deadline_id>', methods=['PUT'])
def update_deadline(deadline_id):
    try:
        deadline = Deadline.query.get_or_404(deadline_id)
        data = request.json
        
        deadline.deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
        deadline.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(deadline.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update deadline"}), 500

@api_bp.route('/deadlines/missed', methods=['GET'])
@jwt_required()
@require_admin_role()
def get_missed_deadlines():
    """Get list of students who missed deadlines for each level"""
    try:
        now = datetime.utcnow()
        result = {
            'level_200': [],
            'level_400': []
        }
        
        # Get deadlines for each level
        deadline_200 = Deadline.query.filter_by(level=ProjectLevel.LEVEL_200).first()
        deadline_400 = Deadline.query.filter_by(level=ProjectLevel.LEVEL_400).first()
        
        # Check Level 200 projects
        if deadline_200 and deadline_200.deadline < now:
            # Get all projects at level 200
            projects_200 = Project.query.filter_by(level=ProjectLevel.LEVEL_200).all()
            for project in projects_200:
                student = project.student
                student_user = getattr(student, 'user', None)
                
                # Student missed deadline if:
                # 1. They haven't submitted (submitted_at is None), OR
                # 2. They submitted after the deadline
                missed = False
                if not project.submitted_at:
                    missed = True
                elif project.submitted_at > deadline_200.deadline:
                    missed = True
                
                if missed and student_user:
                    result['level_200'].append({
                        'project_id': project.id,
                        'project_title': project.title,
                        'student_id': student_user.id,
                        'student_name': student_user.name,
                        'student_email': student_user.email,
                        'student_registration': student.student_id if student else None,
                        'study_program': project.study_program.name if project.study_program else None,
                        'submitted_at': project.submitted_at.isoformat() if project.submitted_at else None,
                        'deadline': deadline_200.deadline.isoformat(),
                        'days_overdue': (now - deadline_200.deadline).days
                    })
        
        # Check Level 400 projects
        if deadline_400 and deadline_400.deadline < now:
            # Get all projects at level 400
            projects_400 = Project.query.filter_by(level=ProjectLevel.LEVEL_400).all()
            for project in projects_400:
                student = project.student
                student_user = getattr(student, 'user', None)
                
                # Student missed deadline if:
                # 1. They haven't submitted (submitted_at is None), OR
                # 2. They submitted after the deadline
                missed = False
                if not project.submitted_at:
                    missed = True
                elif project.submitted_at > deadline_400.deadline:
                    missed = True
                
                if missed and student_user:
                    result['level_400'].append({
                        'project_id': project.id,
                        'project_title': project.title,
                        'student_id': student_user.id,
                        'student_name': student_user.name,
                        'student_email': student_user.email,
                        'student_registration': student.student_id if student else None,
                        'study_program': project.study_program.name if project.study_program else None,
                        'submitted_at': project.submitted_at.isoformat() if project.submitted_at else None,
                        'deadline': deadline_400.deadline.isoformat(),
                        'days_overdue': (now - deadline_400.deadline).days
                    })
        
        return jsonify(result), 200
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in get_missed_deadlines: {str(e)}")
        print(error_details)
        return jsonify({"error": "Failed to fetch missed deadlines", "details": str(e)}), 500

# Project Submission Routes
@api_bp.route('/projects/<int:project_id>/submit', methods=['POST'])
def submit_project(project_id):
    try:
        project = Project.query.get_or_404(project_id)
        data = request.json
        
        # Check if deadline has passed
        if project.submitted_at:
            return jsonify({"error": "Project already submitted"}), 400
        
        # Update project with submission data
        project.github_link = data.get('github_link')
        if 'documentation_link' in data:
            project.documentation_link = data.get('documentation_link')
        project.submitted_at = datetime.utcnow()
        success, error = update_project_status(project, ProjectStatus.SUBMITTED)
        if not success:
            db.session.rollback()
            return jsonify({"error": f"Failed to update project status: {error}"}), 500
        
        db.session.commit()
        return jsonify(project.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to submit project"}), 500

# Enhanced Evaluation Routes - New detailed scoring
@api_bp.route('/evaluations/detailed', methods=['POST'])
def create_detailed_evaluation():
    try:
        data = request.json
        project_id = data.get('project_id')
        admin_id = data.get('admin_id', 1)  # Default admin for testing
        
        # Get individual scores
        code_quality = data.get('code_quality', 0)
        documentation_score = data.get('documentation_score', 0)
        functionality_score = data.get('functionality_score', 0)
        clarity_communication = data.get('clarity_communication', 0)
        visual_presentation = data.get('visual_presentation', 0)
        technical_explanation = data.get('technical_explanation', 0)
        
        # Calculate totals
        total_project_marks = code_quality + documentation_score + functionality_score
        total_presentation_marks = clarity_communication + visual_presentation + technical_explanation
        overall_total = total_project_marks + total_presentation_marks
        overall_percentage = round((overall_total / 100) * 100, 2) if overall_total else 0
        
        # Determine grade
        grade = 'F'
        if overall_percentage >= 90:
            grade = 'A'
        elif overall_percentage >= 80:
            grade = 'B'
        elif overall_percentage >= 70:
            grade = 'C'
        elif overall_percentage >= 60:
            grade = 'D'
        
        evaluation = Evaluation(
            project_id=project_id,
            admin_id=admin_id,
            total_score=overall_percentage,
            code_quality=code_quality,
            documentation_score=documentation_score,
            functionality_score=functionality_score,
            clarity_communication=clarity_communication,
            visual_presentation=visual_presentation,
            technical_explanation=technical_explanation,
            total_project_marks=total_project_marks,
            total_presentation_marks=total_presentation_marks,
            overall_percentage=overall_percentage,
            grade=grade,
            comments=data.get('comments', '')
        )
        
        db.session.add(evaluation)
        db.session.commit()
        
        return jsonify(evaluation.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create evaluation"}), 500

# ============================================================================
# Student Dashboard Endpoints
# ============================================================================

def get_current_student():
    """Helper function to get current student profile from JWT token"""
    current_user_id = get_jwt_identity()
    try:
        current_user_id = int(current_user_id)
    except (ValueError, TypeError):
        return None, None
    
    current_user = User.query.get(current_user_id)
    if not current_user or current_user.role != UserRole.STUDENT:
        return None, None
    
    student = Student.query.filter_by(user_id=current_user.id).first()
    return current_user, student

def verify_project_ownership(project_id, student_id):
    """Verify that a project belongs to a student"""
    project = Project.query.get(project_id)
    if not project:
        return None, "Project not found"
    if project.student_id != student_id:
        return None, "Project not found"  # Generic message for security
    return project, None

def _normalize_status(status):
    """Helper function to normalize status to ProjectStatus enum"""
    if isinstance(status, ProjectStatus):
        return status
    elif isinstance(status, str):
        # Try to find enum by value
        for ps in ProjectStatus:
            if ps.value == status:
                return ps
        # If not found by value, try direct conversion
        try:
            return ProjectStatus(status)
        except ValueError:
            raise ValueError(f"Invalid status value: {status}")
    else:
        try:
            return ProjectStatus(status)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid status type: {type(status)}")

def update_project_status(project, new_status):
    """
    Update project status with validation
    
    Args:
        project: Project instance
        new_status: ProjectStatus enum value
    
    Returns:
        tuple: (success: bool, error_message: str or None)
    """
    try:
        new_status = _normalize_status(new_status)
    except ValueError as e:
        return False, str(e)
    
    # Define valid status transitions
    valid_transitions = {
        ProjectStatus.PENDING_APPROVAL: [ProjectStatus.DRAFT, ProjectStatus.REJECTED],  # Can be approved or rejected
        ProjectStatus.DRAFT: [ProjectStatus.SUBMITTED, ProjectStatus.REJECTED],
        ProjectStatus.SUBMITTED: [ProjectStatus.UNDER_REVIEW, ProjectStatus.REJECTED],
        ProjectStatus.UNDER_REVIEW: [ProjectStatus.EVALUATED, ProjectStatus.REJECTED],
        ProjectStatus.EVALUATED: [],  # Final state, no transitions
        ProjectStatus.REJECTED: [],  # Final state, no transitions
    }
    
    try:
        current_status = _normalize_status(project.status)
    except ValueError as e:
        return False, f"Invalid current status: {e}"
    
    # Allow same status (idempotent)
    if current_status == new_status:
        return True, None
    
    # Check if transition is valid
    if new_status not in valid_transitions.get(current_status, []):
        return False, f"Invalid status transition from {current_status.value} to {new_status.value}"
    
    # Update status
    project.status = new_status
    project.updated_at = datetime.utcnow()
    
    return True, None

def calculate_status_timeline(project):
    """
    Calculate project status timeline in the new format
    
    Returns:
        dict: Timeline with submitted, under_review, and evaluated stages
    """
    # Normalize project status to ProjectStatus enum
    if isinstance(project.status, ProjectStatus):
        current_status = project.status
    else:
        try:
            current_status = ProjectStatus(project.status)
        except (ValueError, AttributeError):
            current_status = ProjectStatus.DRAFT
    
    timeline = {
        "submitted": {"status": "pending", "date": None},
        "under_review": {"status": "pending", "date": None},
        "evaluated": {"status": "pending", "date": None}
    }
    
    # Submitted stage
    if project.submitted_at:
        timeline["submitted"] = {
            "status": "completed",
            "date": project.submitted_at.isoformat()
        }
    
    # Under review stage - triggered when first evaluation is created
    evaluations = project.evaluations.all()
    if evaluations:
        first_eval = min(evaluations, key=lambda e: e.created_at)
        if current_status == ProjectStatus.UNDER_REVIEW:
            timeline["under_review"] = {
                "status": "current",
                "date": first_eval.created_at.isoformat()
            }
        elif current_status in [ProjectStatus.EVALUATED, ProjectStatus.REJECTED]:
            timeline["under_review"] = {
                "status": "completed",
                "date": first_eval.created_at.isoformat()
            }
        else:
            # If evaluations exist but status is still submitted, mark as current
            timeline["under_review"] = {
                "status": "current",
                "date": first_eval.created_at.isoformat()
            }
    
    # Evaluated stage - both PROJECT and PRESENTATION evaluations must exist
    project_eval = next((e for e in evaluations if e.evaluation_type == EvaluationType.PROJECT), None)
    pres_eval = next((e for e in evaluations if e.evaluation_type == EvaluationType.PRESENTATION), None)
    
    if project_eval and pres_eval:
        latest_eval = max(project_eval, pres_eval, key=lambda e: e.created_at)
        timeline["evaluated"] = {
            "status": "completed",
            "date": latest_eval.created_at.isoformat()
        }
    elif project_eval or pres_eval:
        # One evaluation exists but not both
        existing_eval = project_eval or pres_eval
        timeline["evaluated"] = {
            "status": "current",
            "date": existing_eval.created_at.isoformat()
        }
    
    return timeline

def get_project_evaluation_details(project):
    """Get detailed evaluation breakdown for a project"""
    evaluations = project.evaluations.order_by(Evaluation.created_at.desc()).all()
    if not evaluations:
        return None
    
    # Get the latest evaluation (or combine both PROJECT and PRESENTATION if they exist)
    project_eval = next((e for e in evaluations if e.evaluation_type == EvaluationType.PROJECT), None)
    presentation_eval = next((e for e in evaluations if e.evaluation_type == EvaluationType.PRESENTATION), None)
    
    # Use project evaluation as primary, or presentation if that's all we have
    primary_eval = project_eval or presentation_eval
    if not primary_eval:
        return None
    
    evaluator = User.query.get(primary_eval.admin_id)
    
    # Build marks breakdown
    marks = {
        "project_marks": {},
        "presentation_marks": {}
    }
    
    if project_eval:
        # Get marks from EvaluationMark for project evaluation
        for mark in project_eval.marks:
            criterion_key = mark.criterion_name.lower().replace(' ', '_').replace('&', '').replace('-', '_')
            marks["project_marks"][criterion_key] = {
                "score": mark.score,
                "max_score": mark.max_score,
                "feedback": mark.comments or ""
            }
        
        # Fallback to direct fields if no marks exist
        if not marks["project_marks"]:
            if project_eval.code_quality is not None:
                marks["project_marks"]["code_quality"] = {
                    "score": project_eval.code_quality,
                    "max_score": 20,
                    "feedback": ""
                }
            if project_eval.documentation_score is not None:
                marks["project_marks"]["documentation"] = {
                    "score": project_eval.documentation_score,
                    "max_score": 20,
                    "feedback": ""
                }
            if project_eval.functionality_score is not None:
                marks["project_marks"]["functionality"] = {
                    "score": project_eval.functionality_score,
                    "max_score": 30,
                    "feedback": ""
                }
    
    if presentation_eval:
        # Get marks from EvaluationMark for presentation evaluation
        for mark in presentation_eval.marks:
            criterion_key = mark.criterion_name.lower().replace(' ', '_').replace('&', '').replace('-', '_')
            marks["presentation_marks"][criterion_key] = {
                "score": mark.score,
                "max_score": mark.max_score,
                "feedback": mark.comments or ""
            }
        
        # Fallback to direct fields if no marks exist
        if not marks["presentation_marks"]:
            if presentation_eval.clarity_communication is not None:
                marks["presentation_marks"]["clarity_communication"] = {
                    "score": presentation_eval.clarity_communication,
                    "max_score": 10,
                    "feedback": ""
                }
            if presentation_eval.visual_presentation is not None:
                marks["presentation_marks"]["visual_presentation"] = {
                    "score": presentation_eval.visual_presentation,
                    "max_score": 10,
                    "feedback": ""
                }
            if presentation_eval.technical_explanation is not None:
                marks["presentation_marks"]["technical_explanation"] = {
                    "score": presentation_eval.technical_explanation,
                    "max_score": 10,
                    "feedback": ""
                }
    
    # Calculate total and percentage
    # If both evaluations exist, use overall_percentage and grade
    if project_eval and presentation_eval and project_eval.overall_percentage is not None:
        total_score = project_eval.overall_percentage
        percentage = project_eval.overall_percentage
        grade = project_eval.grade
        max_score = 100
    else:
        # Use primary evaluation's score
        total_score = primary_eval.total_score
        percentage = round(total_score, 2)
        grade = primary_eval.grade
        max_score = 100
    
    # Combine feedback from both evaluations if they exist
    overall_feedback = ""
    if project_eval and project_eval.comments:
        overall_feedback += f"Project: {project_eval.comments}\n"
    if presentation_eval and presentation_eval.comments:
        overall_feedback += f"Presentation: {presentation_eval.comments}"
    if not overall_feedback and primary_eval.comments:
        overall_feedback = primary_eval.comments
    
    return {
        "total_score": total_score,
        "max_score": max_score,
        "percentage": percentage,
        "grade": grade,
        "marks": marks,
        "overall_feedback": overall_feedback.strip()
    }

@api_bp.route('/students/me/projects', methods=['GET'])
@jwt_required()
def get_my_projects():
    """Get all projects belonging to the currently authenticated student"""
    try:
        current_user, student = get_current_student()
        
        if not current_user or not student:
            return jsonify({"error": "Access denied"}), 403
        
        # Get query parameters
        status = request.args.get('status')
        level = request.args.get('level')
        
        # Build query
        query = Project.query.filter_by(student_id=student.id)
        
        if status:
            try:
                status_enum = ProjectStatus(status)
                query = query.filter_by(status=status_enum)
            except ValueError:
                # Fallback to string comparison for backward compatibility
                query = query.filter_by(status=status)
        
        if level:
            try:
                query = query.filter_by(level=ProjectLevel(int(level)))
            except ValueError:
                return jsonify({"error": "Invalid level parameter"}), 400
        
        projects = query.order_by(Project.created_at.desc()).all()
        
        return jsonify({
            'projects': [project.to_dict() for project in projects],
            'total': len(projects)
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch projects", "details": str(e)}), 500

@api_bp.route('/students/me/dashboard', methods=['GET'])
@jwt_required()
def get_my_dashboard():
    """Get comprehensive dashboard summary for the current student (single project)"""
    try:
        current_user, student = get_current_student()
        
        if not current_user or not student:
            return jsonify({"error": "Access denied"}), 403
        
        # Get student's single project
        project = Project.query.filter_by(student_id=student.id).first()
        
        # Calculate timeline
        timeline = calculate_status_timeline(project) if project else None
        
        # Get evaluation details if project exists
        has_evaluation = False
        total_score = None
        if project:
            evaluations = project.evaluations.all()
            has_evaluation = len(evaluations) > 0
            if has_evaluation:
                # Get overall percentage if both evaluations exist
                project_eval = next((e for e in evaluations if e.evaluation_type == EvaluationType.PROJECT), None)
                pres_eval = next((e for e in evaluations if e.evaluation_type == EvaluationType.PRESENTATION), None)
                if project_eval and pres_eval and project_eval.overall_percentage:
                    total_score = project_eval.overall_percentage
                elif project_eval:
                    total_score = project_eval.total_score
                elif pres_eval:
                    total_score = pres_eval.total_score
        
        # Build project summary
        project_data = None
        if project:
            project_data = {
                "id": project.id,
                "title": project.title,
                "status": project.status.value if isinstance(project.status, ProjectStatus) else project.status,
                "level": project.level.value,
                "submitted_at": project.submitted_at.isoformat() if project.submitted_at else None,
                "status_timeline": timeline,
                "has_evaluation": has_evaluation,
                "total_score": total_score
            }
        
        # Get deadlines for project's level
        deadlines = []
        if project:
            deadline_obj = Deadline.query.filter_by(level=project.level).first()
            if deadline_obj:
                now = datetime.utcnow()
                is_passed = deadline_obj.deadline < now
                days_remaining = (deadline_obj.deadline - now).days if not is_passed else 0
                
                deadlines.append({
                    "level": project.level.value,
                    "deadline": deadline_obj.deadline.isoformat(),
                    "is_passed": is_passed,
                    "days_remaining": days_remaining
                })
        
        return jsonify({
            "student": {
                "id": current_user.id,
                "name": current_user.name,
                "email": current_user.email,
                "student_id": student.student_id
            },
            "project": project_data,
            "deadlines": deadlines
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch dashboard data", "details": str(e)}), 500

@api_bp.route('/students/me/projects/<int:project_id>', methods=['GET'])
@jwt_required()
def get_my_project(project_id):
    """Get detailed information about a specific project with evaluation details"""
    try:
        current_user, student = get_current_student()
        
        if not current_user or not student:
            return jsonify({"error": "Access denied"}), 403
        
        # Verify project ownership
        project, error = verify_project_ownership(project_id, student.id)
        if error:
            return jsonify({"error": error}), 404
        
        # Get evaluation details
        evaluation_details = get_project_evaluation_details(project)
        
        # Get timeline
        timeline = calculate_status_timeline(project)
        
        # Build unified project response
        study_program = project.study_program
        student_user = getattr(project.student, 'user', None)
        
        project_data = {
            "id": project.id,
            "title": project.title,
            "description": project.description,
            "level": project.level.value,
            "status": project.status.value if isinstance(project.status, ProjectStatus) else project.status,
            "study_program": {
                "id": study_program.id if study_program else None,
                "code": study_program.code if study_program else None,
                "name": study_program.name if study_program else None
            },
            "student": {
                "id": student_user.id if student_user else None,
                "name": student_user.name if student_user else None,
                "student_id": project.student.student_id if project.student else None
            },
            "submission": {
                "github_link": project.github_link,
                "documentation_link": project.documentation_link,
                "submitted_at": project.submitted_at.isoformat() if project.submitted_at else None
            },
            "timeline": timeline,
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat()
        }
        
        return jsonify({
            "project": project_data,
            "evaluation": evaluation_details
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch project", "details": str(e)}), 500

@api_bp.route('/students/me/projects/<int:project_id>/submission', methods=['PUT'])
@jwt_required()
def update_my_project_submission(project_id):
    """Update project submission (GitHub link, documentation link)"""
    try:
        current_user, student = get_current_student()
        
        if not current_user or not student:
            return jsonify({"error": "Access denied"}), 403
        
        # Verify project ownership
        project, error = verify_project_ownership(project_id, student.id)
        if error:
            return jsonify({"error": error}), 404
        
        # Check if project is approved (must be DRAFT or later status, not PENDING_APPROVAL or REJECTED)
        if project.status == ProjectStatus.PENDING_APPROVAL:
            return jsonify({"error": "Project is pending admin approval. You cannot submit until it is approved."}), 403
        
        if project.status == ProjectStatus.REJECTED:
            return jsonify({"error": "Project has been rejected. Please contact an administrator."}), 403
        
        data = request.json
        
        # Update fields
        if 'github_link' in data:
            project.github_link = data['github_link']
        
        if 'documentation_link' in data:
            project.documentation_link = data['documentation_link']
        
        if 'pdf_path' in data:
            project.pdf_path = data['pdf_path']
        
        # If first submission, set submitted_at and trigger status transition
        if not project.submitted_at:
            project.submitted_at = datetime.utcnow()
            # Automatic status transition: draft -> submitted
            success, error = update_project_status(project, ProjectStatus.SUBMITTED)
            if not success:
                db.session.rollback()
                return jsonify({"error": f"Failed to update project status: {error}"}), 500
        
        # Always update updated_at
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            "message": "Submission updated successfully",
            "project": project.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update submission", "details": str(e)}), 500

@api_bp.route('/students/me/projects/<int:project_id>/timeline', methods=['GET'])
@jwt_required()
def get_my_project_timeline(project_id):
    """Get project status timeline"""
    try:
        current_user, student = get_current_student()
        
        if not current_user or not student:
            return jsonify({"error": "Access denied"}), 403
        
        # Verify project ownership
        project, error = verify_project_ownership(project_id, student.id)
        if error:
            return jsonify({"error": error}), 404
        
        # Calculate timeline
        timeline, current_stage, progress_percentage = calculate_status_timeline(project)
        
        return jsonify({
            "project_id": project_id,
            "timeline": timeline,
            "current_stage": current_stage,
            "progress_percentage": progress_percentage
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch timeline", "details": str(e)}), 500
