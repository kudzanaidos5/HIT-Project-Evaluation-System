from flask import Blueprint, request, jsonify, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.models import User, StudyProgram, Project, Evaluation, EvaluationMark, UserRole, ProjectLevel, Deadline, EvaluationType
from marshmallow import Schema, fields, ValidationError
from sqlalchemy import func, desc
from functools import wraps
from datetime import datetime, time
import csv
from io import StringIO, BytesIO
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit

api_bp = Blueprint('api', __name__)
class UserSchema(Schema):
    name = fields.Str(required=True, min_length=2, max_length=100)
    email = fields.Email(required=True)
    password = fields.Str(required=True, min_length=6)
    role = fields.Str(required=True, validate=lambda x: x in ['ADMIN', 'STUDENT'])

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
    pending_projects = project_query.filter(Project.status == 'pending').count()
    completed_projects = project_query.filter(Project.status == 'evaluated').count()
    status_rows = project_query.with_entities(Project.status, func.count(Project.id)).group_by(Project.status).all()
    status_breakdown = {status: count for status, count in status_rows}

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
        func.count(Project.id).label('project_count'),
        func.avg(Evaluation.total_score).label('average_score')
    ).join(Project, StudyProgram.id == Project.study_program_id).outerjoin(Evaluation, Evaluation.project_id == Project.id)

    if level:
        study_program_query = study_program_query.filter(Project.level == level)
    if start_date:
        study_program_query = study_program_query.filter(Project.created_at >= start_date)
    if end_date:
        study_program_query = study_program_query.filter(Project.created_at <= end_date)

    study_program_rows = study_program_query.group_by(StudyProgram.id).all()
    study_programs = [{
        "study_program_name": row.study_program_name,
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
    pdf = canvas.Canvas(buffer, pagesize=LETTER)
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
        return jsonify({"error": "Failed to fetch projects"}), 500

@api_bp.route('/projects', methods=['POST'])
@jwt_required()
@require_admin_role()
def create_project():
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
        
        # Update user fields
        if 'name' in data:
            user.name = data['name']
        if 'email' in data:
            # Check if email is already taken by another user
            existing_user = User.query.filter_by(email=data['email']).first()
            if existing_user and existing_user.id != user_id:
                return jsonify({"error": "Email already taken by another user"}), 400
            user.email = data['email']
        if 'role' in data:
            user.role = UserRole.ADMIN if data['role'] == 'ADMIN' else UserRole.STUDENT
        
        db.session.commit()
        
        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to update user"}), 500

@api_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@require_admin_role()
def delete_user(user_id):
    try:
        user = User.query.get_or_404(user_id)
        
        # Check if user has projects
        projects = Project.query.filter_by(student_id=user_id).all()
        if projects:
            return jsonify({"error": "Cannot delete user with existing projects"}), 400
        
        # Check if user has evaluations
        evaluations = Evaluation.query.filter_by(admin_id=user_id).all()
        if evaluations:
            return jsonify({"error": "Cannot delete user with existing evaluations"}), 400
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({"message": "User deleted successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to delete user"}), 500
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
        func.avg(Evaluation.total_score).label('avg_score'),
        func.count(Evaluation.id).label('evaluation_count')
    ).select_from(StudyProgram).join(Project, StudyProgram.id == Project.study_program_id).join(
        Evaluation, Project.id == Evaluation.project_id
    )
    
    # Filter by level if provided
    if level_param:
        level = ProjectLevel(int(level_param))
        query = query.filter(Project.level == level)
    
    results = query.group_by(StudyProgram.id).all()
    
    return jsonify([{
        'study_program_name': result.name,
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
    
    return jsonify([{
        'status': status,
        'count': count
    } for status, count in pipeline_data]), 200

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
        project.submitted_at = datetime.utcnow()
        project.status = 'submitted'
        
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
