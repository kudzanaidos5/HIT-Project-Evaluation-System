from app.extensions import db
from datetime import datetime
from enum import Enum
from flask_bcrypt import Bcrypt
import re
from sqlalchemy.orm import validates
from sqlalchemy import event

bcrypt = Bcrypt()

class UserRole(Enum):
    ADMIN = "ADMIN"
    STUDENT = "STUDENT"

class ProjectLevel(Enum):
    LEVEL_200 = 200
    LEVEL_400 = 400

class EvaluationType(Enum):
    PROJECT = "PROJECT"  # Code quality, documentation, functionality
    PRESENTATION = "PRESENTATION"  # Clarity & communication, visual presentation, technical explanation

class ProjectStatus(Enum):
    PENDING_APPROVAL = "pending_approval"  # Created by student, awaiting admin approval
    DRAFT = "draft"           # Approved but not submitted
    SUBMITTED = "submitted"   # Student has submitted links
    UNDER_REVIEW = "under_review"  # Being evaluated
    EVALUATED = "evaluated"   # Fully evaluated
    REJECTED = "rejected"     # Rejected by admin

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    is_oauth_user = db.Column(db.Boolean, nullable=False, default=False)
    oauth_provider = db.Column(db.String(50), nullable=True)
    oauth_subject = db.Column(db.String(255), nullable=True)
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.STUDENT)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    student_profile = db.relationship('Student', backref='user', uselist=False, cascade='all, delete-orphan')
    admin_profile = db.relationship('Admin', backref='user', uselist=False, cascade='all, delete-orphan')
    evaluations = db.relationship('Evaluation', backref='evaluator', lazy='dynamic')
    
    @validates('email')
    def normalize_email(self, key, value):
        if value is None:
            raise ValueError('Email is required')
        return value.strip().lower()
    
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        if not self.password_hash:
            return False
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        result = {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role.value,
            'is_oauth_user': self.is_oauth_user,
            'created_at': self.created_at.isoformat()
        }
        # Include student profile if it exists
        try:
            # Access student_profile in a safe way
            student_profile = getattr(self, 'student_profile', None)
            if student_profile:
                result['student_profile'] = {
                    'id': student_profile.id,
                    'student_id': student_profile.student_id,
                    'department': student_profile.department
                }
                # Count projects for this student
                from .models import Project
                result['project_count'] = Project.query.filter_by(student_id=student_profile.id).count()
        except Exception:
            # If there's an issue accessing student_profile, just skip it
            pass
        
        # Count evaluations created by this user (if admin)
        try:
            from .models import Evaluation
            result['evaluation_count'] = Evaluation.query.filter_by(admin_id=self.id).count()
        except Exception:
            result['evaluation_count'] = 0
        
        # Set default project_count if not set
        if 'project_count' not in result:
            result['project_count'] = 0
            
        return result

class Student(db.Model):
    __tablename__ = 'students'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    student_id = db.Column(db.String(20), unique=True, nullable=True)
    department = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    projects = db.relationship('Project', backref='student', lazy='dynamic')

    @validates('student_id')
    def validate_student_id(self, key, value):
        # Allow null to support profiles created before assigning IDs
        if value is None or value == '':
            return value
        pattern = r'^[A-Za-z]\d{6}[A-Za-z]$'
        if not re.fullmatch(pattern, str(value)):
            raise ValueError('student_id must match format: 1 letter + 6 digits + 1 letter (e.g., H230376W)')
        # Normalize to uppercase for consistency
        return str(value).upper()

class Admin(db.Model):
    __tablename__ = 'admins'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    department = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class StudyProgram(db.Model):
    __tablename__ = 'study_programs'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    projects = db.relationship('Project', backref='study_program', lazy='dynamic')

class Project(db.Model):
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    level = db.Column(db.Enum(ProjectLevel), nullable=False)
    study_program_id = db.Column(db.Integer, db.ForeignKey('study_programs.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    status = db.Column(db.Enum(ProjectStatus, values_callable=lambda x: [e.value for e in x]), nullable=False, default=ProjectStatus.DRAFT)
    
    # Submission fields
    github_link = db.Column(db.String(500), nullable=True)
    documentation_link = db.Column(db.String(500), nullable=True)  # Google Drive or other documentation links
    pdf_path = db.Column(db.String(500), nullable=True)
    submitted_at = db.Column(db.DateTime, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    evaluations = db.relationship('Evaluation', backref='project', lazy='dynamic', cascade='all, delete-orphan')
    
    @property
    def status_value(self):
        """Get status as string value, handling both enum and string"""
        if isinstance(self.status, ProjectStatus):
            return self.status.value
        elif isinstance(self.status, str):
            return self.status
        else:
            return str(self.status) if self.status else 'draft'
    
    def to_dict(self):
        study_program = self.study_program
        student = self.student
        student_user = getattr(student, 'user', None)

        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'level': self.level.value,
            'study_program_id': self.study_program_id,
            'study_program_name': study_program.name if study_program else None,
            'student_id': self.student_id,
            'student_name': student_user.name if student_user else None,
            'status': self.status_value,
            'github_link': self.github_link,
            'documentation_link': self.documentation_link,
            'pdf_path': self.pdf_path,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'evaluation_count': self.evaluations.count()
        }

class Evaluation(db.Model):
    __tablename__ = 'evaluations'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    evaluation_type = db.Column(db.Enum(EvaluationType), nullable=False)
    
    # Overall score for this evaluation
    total_score = db.Column(db.Float, nullable=False, default=0.0)
    
    # Project Marks (Only used when evaluation_type is PROJECT)
    code_quality = db.Column(db.Float, nullable=True)
    documentation_score = db.Column(db.Float, nullable=True)
    functionality_score = db.Column(db.Float, nullable=True)
    
    # Presentation Marks (Only used when evaluation_type is PRESENTATION)
    clarity_communication = db.Column(db.Float, nullable=True)
    visual_presentation = db.Column(db.Float, nullable=True)
    technical_explanation = db.Column(db.Float, nullable=True)
    
    # Calculated totals (for backward compatibility and combined calculations)
    total_project_marks = db.Column(db.Float, nullable=True, default=0.0)
    total_presentation_marks = db.Column(db.Float, nullable=True, default=0.0)
    overall_percentage = db.Column(db.Float, nullable=True, default=0.0)
    grade = db.Column(db.String(5), nullable=True)  # A, B, C, D, F
    
    comments = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    marks = db.relationship('EvaluationMark', backref='evaluation', lazy='dynamic', cascade='all, delete-orphan')
    
    # Unique constraint: one evaluation of each type per project
    __table_args__ = (db.UniqueConstraint('project_id', 'evaluation_type', name='unique_project_evaluation_type'),)
    
    def calculate_total_score(self):
        """Calculate total score as percentage"""
        if not self.marks.count():
            return 0.0
        
        total_score = sum(mark.score for mark in self.marks)
        total_max_score = sum(mark.max_score for mark in self.marks)
        
        if total_max_score == 0:
            return 0.0
        
        return round((total_score / total_max_score) * 100, 2)
    
    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'project_title': self.project.title if self.project else None,
            'admin_id': self.admin_id,
            'admin_name': self.evaluator.name if self.evaluator else None,
            'evaluation_type': self.evaluation_type.value if self.evaluation_type else None,
            'total_score': self.total_score,
            
            # Individual marks (only relevant based on type)
            'code_quality': self.code_quality,
            'documentation_score': self.documentation_score,
            'functionality_score': self.functionality_score,
            'clarity_communication': self.clarity_communication,
            'visual_presentation': self.visual_presentation,
            'technical_explanation': self.technical_explanation,
            
            # Calculated totals
            'total_project_marks': self.total_project_marks,
            'total_presentation_marks': self.total_presentation_marks,
            'overall_percentage': self.overall_percentage,
            'grade': self.grade,
            
            'comments': self.comments,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'marks': [mark.to_dict() for mark in self.marks]
        }

class EvaluationMark(db.Model):
    __tablename__ = 'evaluation_marks'
    
    id = db.Column(db.Integer, primary_key=True)
    evaluation_id = db.Column(db.Integer, db.ForeignKey('evaluations.id'), nullable=False)
    criterion_name = db.Column(db.String(100), nullable=False)
    max_score = db.Column(db.Float, nullable=False)
    score = db.Column(db.Float, nullable=False, default=0.0)
    comments = db.Column(db.Text, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'evaluation_id': self.evaluation_id,
            'criterion_name': self.criterion_name,
            'max_score': self.max_score,
            'score': self.score,
            'comments': self.comments
        }

class Deadline(db.Model):
    __tablename__ = 'deadlines'
    
    id = db.Column(db.Integer, primary_key=True)
    level = db.Column(db.Enum(ProjectLevel), nullable=False, unique=True)
    deadline = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'level': self.level.value,
            'deadline': self.deadline.isoformat(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }