"""
Comprehensive Database Migration
=================================

This migration file contains all database schema definitions and migration scripts
for the Student Evaluation System.

Revision ID: comprehensive_001
Revises: 800742c69c57
Create Date: 2025-12-12

This file consolidates:
- Initial database schema (all tables and columns)
- OAuth user support columns
- Project submission fields
- Evaluation scoring fields
- Status enum migration logic

Usage:
    - As reference documentation
    - For manual database setup
    - For understanding the complete schema
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'comprehensive_001'
down_revision = '800742c69c57'
branch_labels = None
depends_on = None


def upgrade():
    """
    Upgrade database schema.
    
    This function contains all the database schema changes including:
    1. All table definitions
    2. All column additions
    3. All constraints and relationships
    4. Enum type definitions
    """
    
    # ============================================================================
    # ENUM TYPES
    # ============================================================================
    # Note: SQLite doesn't support native ENUMs, so we use VARCHAR with constraints
    # For PostgreSQL, these would be proper ENUM types
    
    # UserRole Enum: ADMIN, STUDENT
    # ProjectLevel Enum: LEVEL_200 (200), LEVEL_400 (400)
    # ProjectStatus Enum: pending_approval, draft, submitted, under_review, evaluated, rejected
    # EvaluationType Enum: PROJECT, PRESENTATION
    # NotificationType Enum: SUCCESS, ERROR, INFO, WARNING
    # NotificationAudience Enum: ADMIN, STUDENT, ALL
    
    # ============================================================================
    # TABLE: deadlines
    # ============================================================================
    # Stores project submission deadlines for different levels
    op.create_table('deadlines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('level', sa.Enum('LEVEL_200', 'LEVEL_400', name='projectlevel'), nullable=False),
        sa.Column('deadline', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('level', name='uq_deadlines_level')
    )
    
    # ============================================================================
    # TABLE: study_programs
    # ============================================================================
    # Stores academic study programs (e.g., CS200, IT200, SE200)
    op.create_table('study_programs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_study_programs_code')
    )
    
    # ============================================================================
    # TABLE: users
    # ============================================================================
    # Core user table for both students and admins
    # Includes OAuth support fields
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=120), nullable=False),
        sa.Column('password_hash', sa.String(length=128), nullable=False),
        
        # OAuth Support Fields
        sa.Column('is_oauth_user', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('oauth_provider', sa.String(length=50), nullable=True),
        sa.Column('oauth_subject', sa.String(length=255), nullable=True),
        
        sa.Column('role', sa.Enum('ADMIN', 'STUDENT', name='userrole'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email', name='uq_users_email')
    )
    
    # ============================================================================
    # TABLE: admins
    # ============================================================================
    # Admin-specific profile information
    op.create_table('admins',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('department', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_admins_user_id'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_admins_user_id')
    )
    
    # ============================================================================
    # TABLE: students
    # ============================================================================
    # Student-specific profile information
    op.create_table('students',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.String(length=20), nullable=True),  # Format: H230376W
        sa.Column('department', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_students_user_id'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('student_id', name='uq_students_student_id'),
        sa.UniqueConstraint('user_id', name='uq_students_user_id')
    )
    
    # ============================================================================
    # TABLE: notifications
    # ============================================================================
    # System notifications for users
    op.create_table('notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),  # Nullable for audience-based notifications
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('type', sa.Enum('SUCCESS', 'ERROR', 'INFO', 'WARNING', name='notificationtype'), nullable=False),
        sa.Column('read', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('audience', sa.Enum('ADMIN', 'STUDENT', 'ALL', name='notificationaudience'), nullable=True),
        sa.Column('action_label', sa.String(length=100), nullable=True),
        sa.Column('action_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_notifications_user_id'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # ============================================================================
    # TABLE: projects
    # ============================================================================
    # Student project submissions
    # Includes all submission fields: github_link, documentation_link, pdf_path, submitted_at
    op.create_table('projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('level', sa.Enum('LEVEL_200', 'LEVEL_400', name='projectlevel'), nullable=False),
        sa.Column('study_program_id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('pending_approval', 'draft', 'submitted', 'under_review', 'evaluated', 'rejected', name='projectstatus'), nullable=False),
        
        # Submission Fields
        sa.Column('github_link', sa.String(length=500), nullable=True),
        sa.Column('documentation_link', sa.String(length=500), nullable=True),  # Google Drive or other docs
        sa.Column('pdf_path', sa.String(length=500), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], name='fk_projects_student_id'),
        sa.ForeignKeyConstraint(['study_program_id'], ['study_programs.id'], name='fk_projects_study_program_id'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # ============================================================================
    # TABLE: evaluations
    # ============================================================================
    # Project and presentation evaluations
    # Includes all scoring fields for both project and presentation evaluations
    op.create_table('evaluations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('admin_id', sa.Integer(), nullable=False),
        sa.Column('evaluation_type', sa.Enum('PROJECT', 'PRESENTATION', name='evaluationtype'), nullable=False),
        sa.Column('total_score', sa.Float(), nullable=False, server_default='0.0'),
        
        # Project Evaluation Marks (used when evaluation_type is PROJECT)
        sa.Column('code_quality', sa.Float(), nullable=True),
        sa.Column('documentation_score', sa.Float(), nullable=True),
        sa.Column('functionality_score', sa.Float(), nullable=True),
        
        # Presentation Evaluation Marks (used when evaluation_type is PRESENTATION)
        sa.Column('clarity_communication', sa.Float(), nullable=True),
        sa.Column('visual_presentation', sa.Float(), nullable=True),
        sa.Column('technical_explanation', sa.Float(), nullable=True),
        
        # Calculated Totals and Grading
        sa.Column('total_project_marks', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('total_presentation_marks', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('overall_percentage', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('grade', sa.String(length=5), nullable=True),  # A, B, C, D, F
        
        sa.Column('comments', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['admin_id'], ['users.id'], name='fk_evaluations_admin_id'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], name='fk_evaluations_project_id'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('project_id', 'evaluation_type', name='unique_project_evaluation_type')
    )
    
    # ============================================================================
    # TABLE: evaluation_marks
    # ============================================================================
    # Detailed criterion marks for evaluations
    op.create_table('evaluation_marks',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('evaluation_id', sa.Integer(), nullable=False),
        sa.Column('criterion_name', sa.String(length=100), nullable=False),
        sa.Column('max_score', sa.Float(), nullable=False),
        sa.Column('score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('comments', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['evaluation_id'], ['evaluations.id'], name='fk_evaluation_marks_evaluation_id'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    """
    Downgrade database schema.
    
    Removes all tables in reverse order of dependencies.
    """
    op.drop_table('evaluation_marks')
    op.drop_table('evaluations')
    op.drop_table('projects')
    op.drop_table('notifications')
    op.drop_table('students')
    op.drop_table('admins')
    op.drop_table('users')
    op.drop_table('study_programs')
    op.drop_table('deadlines')


# ============================================================================
# ADDITIONAL MIGRATION SCRIPTS
# ============================================================================

def migrate_status_to_enum():
    """
    Migrate project status from old string values to new enum values.
    
    This function handles the migration of project status values:
    - 'pending' -> 'draft'
    - 'submitted' -> 'submitted'
    - 'under_review' -> 'under_review'
    - 'evaluated' -> 'evaluated'
    - 'rejected' -> 'rejected'
    - NULL -> 'draft'
    
    Usage:
        This should be run as a separate data migration after schema changes.
        It's included here for reference and can be extracted to a standalone script.
    """
    connection = op.get_bind()
    
    # Status mapping: old string -> new enum value
    status_mapping = {
        'pending': 'draft',
        'submitted': 'submitted',
        'under_review': 'under_review',
        'evaluated': 'evaluated',
        'rejected': 'rejected',
    }
    
    # Get all projects with their current status
    result = connection.execute(sa.text("SELECT id, status FROM projects"))
    projects = result.fetchall()
    
    print(f"Found {len(projects)} projects to migrate")
    
    updated_count = 0
    for project_id, old_status in projects:
        if old_status is None:
            new_status = 'draft'
            print(f"Project {project_id}: NULL -> draft")
        elif old_status in status_mapping:
            new_status = status_mapping[old_status]
            print(f"Project {project_id}: {old_status} -> {new_status}")
        else:
            # Unknown status, default to draft
            new_status = 'draft'
            print(f"Project {project_id}: {old_status} (unknown) -> draft")
        
        # Update the status
        connection.execute(
            sa.text("UPDATE projects SET status = :new_status WHERE id = :project_id"),
            {"new_status": new_status, "project_id": project_id}
        )
        updated_count += 1
    
    print(f"\nMigration completed successfully! Updated {updated_count} projects.")
    
    # Verify migration
    result = connection.execute(sa.text("SELECT DISTINCT status FROM projects"))
    distinct_statuses = [row[0] for row in result.fetchall()]
    print(f"\nCurrent status values in database: {distinct_statuses}")


def add_missing_columns():
    """
    Add any missing columns to existing tables.
    
    This function checks for and adds columns that might be missing:
    - OAuth fields in users table
    - Submission fields in projects table
    - Scoring fields in evaluations table
    
    Usage:
        This is a safety function for databases that might have been created
        before all columns were added. It's idempotent and safe to run multiple times.
    """
    connection = op.get_bind()
    
    # Check and add OAuth columns to users table
    try:
        result = connection.execute(sa.text("PRAGMA table_info(users)"))
        user_columns = [row[1] for row in result.fetchall()]
        
        if 'is_oauth_user' not in user_columns:
            print("Adding is_oauth_user column to users table...")
            op.add_column('users', sa.Column('is_oauth_user', sa.Boolean(), nullable=False, server_default='0'))
        
        if 'oauth_provider' not in user_columns:
            print("Adding oauth_provider column to users table...")
            op.add_column('users', sa.Column('oauth_provider', sa.String(length=50), nullable=True))
        
        if 'oauth_subject' not in user_columns:
            print("Adding oauth_subject column to users table...")
            op.add_column('users', sa.Column('oauth_subject', sa.String(length=255), nullable=True))
    except Exception as e:
        print(f"Error checking users table: {e}")
    
    # Check and add submission columns to projects table
    try:
        result = connection.execute(sa.text("PRAGMA table_info(projects)"))
        project_columns = [row[1] for row in result.fetchall()]
        
        if 'github_link' not in project_columns:
            print("Adding github_link column to projects table...")
            op.add_column('projects', sa.Column('github_link', sa.String(length=500), nullable=True))
        
        if 'pdf_path' not in project_columns:
            print("Adding pdf_path column to projects table...")
            op.add_column('projects', sa.Column('pdf_path', sa.String(length=500), nullable=True))
        
        if 'submitted_at' not in project_columns:
            print("Adding submitted_at column to projects table...")
            op.add_column('projects', sa.Column('submitted_at', sa.DateTime(), nullable=True))
        
        if 'documentation_link' not in project_columns:
            print("Adding documentation_link column to projects table...")
            op.add_column('projects', sa.Column('documentation_link', sa.String(length=500), nullable=True))
    except Exception as e:
        print(f"Error checking projects table: {e}")
    
    # Check and add scoring columns to evaluations table
    try:
        result = connection.execute(sa.text("PRAGMA table_info(evaluations)"))
        eval_columns = [row[1] for row in result.fetchall()]
        
        scoring_fields = [
            ('code_quality', sa.Float()),
            ('documentation_score', sa.Float()),
            ('functionality_score', sa.Float()),
            ('clarity_communication', sa.Float()),
            ('visual_presentation', sa.Float()),
            ('technical_explanation', sa.Float()),
            ('total_project_marks', sa.Float()),
            ('total_presentation_marks', sa.Float()),
            ('overall_percentage', sa.Float()),
            ('grade', sa.String(length=5))
        ]
        
        for field_name, field_type in scoring_fields:
            if field_name not in eval_columns:
                print(f"Adding {field_name} column to evaluations table...")
                if field_name in ['total_project_marks', 'total_presentation_marks', 'overall_percentage']:
                    op.add_column('evaluations', sa.Column(field_name, field_type, nullable=True, server_default='0.0'))
                else:
                    op.add_column('evaluations', sa.Column(field_name, field_type, nullable=True))
    except Exception as e:
        print(f"Error checking evaluations table: {e}")
    
    print("Column addition check completed!")


# ============================================================================
# SCHEMA DOCUMENTATION
# ============================================================================

"""
DATABASE SCHEMA OVERVIEW
========================

1. USERS TABLE
   - Core authentication and user management
   - Supports both regular and OAuth users
   - Roles: ADMIN, STUDENT
   - Fields: id, name, email, password_hash, is_oauth_user, oauth_provider, oauth_subject, role, created_at

2. ADMINS TABLE
   - Admin-specific profile information
   - One-to-one relationship with users
   - Fields: id, user_id, department, created_at

3. STUDENTS TABLE
   - Student-specific profile information
   - One-to-one relationship with users
   - Fields: id, user_id, student_id (format: H230376W), department, created_at

4. STUDY_PROGRAMS TABLE
   - Academic programs (CS200, IT200, SE200, etc.)
   - Fields: id, code, name, description, created_at

5. PROJECTS TABLE
   - Student project submissions
   - Status workflow: pending_approval -> draft -> submitted -> under_review -> evaluated
   - Submission fields: github_link, documentation_link, pdf_path, submitted_at
   - Fields: id, title, description, level, study_program_id, student_id, status,
             github_link, documentation_link, pdf_path, submitted_at, created_at, updated_at

6. EVALUATIONS TABLE
   - Project and presentation evaluations
   - Two types: PROJECT, PRESENTATION
   - Project marks: code_quality, documentation_score, functionality_score
   - Presentation marks: clarity_communication, visual_presentation, technical_explanation
   - Calculated fields: total_project_marks, total_presentation_marks, overall_percentage, grade
   - Fields: id, project_id, admin_id, evaluation_type, total_score,
             code_quality, documentation_score, functionality_score,
             clarity_communication, visual_presentation, technical_explanation,
             total_project_marks, total_presentation_marks, overall_percentage, grade,
             comments, created_at, updated_at

7. EVALUATION_MARKS TABLE
   - Detailed criterion-level marks
   - Fields: id, evaluation_id, criterion_name, max_score, score, comments

8. DEADLINES TABLE
   - Project submission deadlines by level
   - Fields: id, level, deadline, created_at, updated_at

9. NOTIFICATIONS TABLE
   - System notifications
   - Can be user-specific or audience-based
   - Fields: id, user_id, title, message, type, read, audience, action_label, action_url,
             created_at, read_at

RELATIONSHIPS
=============
- User -> Student (one-to-one)
- User -> Admin (one-to-one)
- Student -> Projects (one-to-many)
- StudyProgram -> Projects (one-to-many)
- Project -> Evaluations (one-to-many)
- Evaluation -> EvaluationMarks (one-to-many)
- User -> Evaluations (one-to-many, as evaluator)
- User -> Notifications (one-to-many)

ENUM VALUES
==========
- UserRole: ADMIN, STUDENT
- ProjectLevel: LEVEL_200 (200), LEVEL_400 (400)
- ProjectStatus: pending_approval, draft, submitted, under_review, evaluated, rejected
- EvaluationType: PROJECT, PRESENTATION
- NotificationType: SUCCESS, ERROR, INFO, WARNING
- NotificationAudience: ADMIN, STUDENT, ALL
"""

