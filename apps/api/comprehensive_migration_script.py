#!/usr/bin/env python3
"""
Comprehensive Database Migration Script
========================================

This script consolidates all database migration operations:
1. Schema creation (if database doesn't exist)
2. Column additions (for existing databases)
3. Status enum migration
4. Data validation

Usage:
    python comprehensive_migration_script.py

This script is safe to run multiple times (idempotent).
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models.models import (
    User, Student, Admin, StudyProgram, Project, Evaluation, 
    EvaluationMark, Deadline, Notification,
    ProjectStatus, UserRole, ProjectLevel, EvaluationType
)
import sqlite3
from datetime import datetime


def check_column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table."""
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cursor.fetchall()]
    return column_name in columns


def check_table_exists(cursor, table_name):
    """Check if a table exists."""
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
    """, (table_name,))
    return cursor.fetchone() is not None


def migrate_schema(cursor, conn):
    """
    Add missing columns to existing tables.
    This is idempotent and safe to run multiple times.
    """
    print("\n" + "="*60)
    print("STEP 1: Checking and adding missing columns...")
    print("="*60)
    
    # ============================================================================
    # USERS TABLE - OAuth Support
    # ============================================================================
    if check_table_exists(cursor, 'users'):
        if not check_column_exists(cursor, 'users', 'is_oauth_user'):
            print("Adding is_oauth_user column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN is_oauth_user BOOLEAN DEFAULT 0")
        
        if not check_column_exists(cursor, 'users', 'oauth_provider'):
            print("Adding oauth_provider column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50)")
        
        if not check_column_exists(cursor, 'users', 'oauth_subject'):
            print("Adding oauth_subject column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN oauth_subject VARCHAR(255)")
    else:
        print("Users table does not exist. Please run Flask-Migrate first.")
        return False
    
    # ============================================================================
    # PROJECTS TABLE - Submission Fields
    # ============================================================================
    if check_table_exists(cursor, 'projects'):
        if not check_column_exists(cursor, 'projects', 'github_link'):
            print("Adding github_link column to projects table...")
            cursor.execute("ALTER TABLE projects ADD COLUMN github_link VARCHAR(500)")
        
        if not check_column_exists(cursor, 'projects', 'pdf_path'):
            print("Adding pdf_path column to projects table...")
            cursor.execute("ALTER TABLE projects ADD COLUMN pdf_path VARCHAR(500)")
        
        if not check_column_exists(cursor, 'projects', 'submitted_at'):
            print("Adding submitted_at column to projects table...")
            cursor.execute("ALTER TABLE projects ADD COLUMN submitted_at DATETIME")
        
        if not check_column_exists(cursor, 'projects', 'documentation_link'):
            print("Adding documentation_link column to projects table...")
            cursor.execute("ALTER TABLE projects ADD COLUMN documentation_link VARCHAR(500)")
    else:
        print("Projects table does not exist. Please run Flask-Migrate first.")
        return False
    
    # ============================================================================
    # EVALUATIONS TABLE - Scoring Fields
    # ============================================================================
    if check_table_exists(cursor, 'evaluations'):
        scoring_fields = [
            ('code_quality', 'FLOAT'),
            ('documentation_score', 'FLOAT'),
            ('functionality_score', 'FLOAT'),
            ('clarity_communication', 'FLOAT'),
            ('visual_presentation', 'FLOAT'),
            ('technical_explanation', 'FLOAT'),
            ('total_project_marks', 'FLOAT'),
            ('total_presentation_marks', 'FLOAT'),
            ('overall_percentage', 'FLOAT'),
            ('grade', 'VARCHAR(5)')
        ]
        
        for field_name, field_type in scoring_fields:
            if not check_column_exists(cursor, 'evaluations', field_name):
                print(f"Adding {field_name} column to evaluations table...")
                cursor.execute(f"ALTER TABLE evaluations ADD COLUMN {field_name} {field_type}")
    else:
        print("Evaluations table does not exist. Please run Flask-Migrate first.")
        return False
    
    conn.commit()
    print("\n✓ Schema migration completed successfully!")
    return True


def migrate_status_to_enum(cursor, conn):
    """
    Migrate project status from old string values to new enum values.
    """
    print("\n" + "="*60)
    print("STEP 2: Migrating project status values...")
    print("="*60)
    
    if not check_table_exists(cursor, 'projects'):
        print("Projects table does not exist. Skipping status migration.")
        return True
    
    # Status mapping: old string -> new enum value
    status_mapping = {
        'pending': 'draft',
        'submitted': 'submitted',
        'under_review': 'under_review',
        'evaluated': 'evaluated',
        'rejected': 'rejected',
    }
    
    # Get all projects with their current status
    cursor.execute("SELECT id, status FROM projects")
    projects = cursor.fetchall()
    
    if not projects:
        print("No projects found. Skipping status migration.")
        return True
    
    print(f"Found {len(projects)} projects to migrate")
    
    updated_count = 0
    for project_id, old_status in projects:
        if old_status is None:
            new_status = 'draft'
            print(f"  Project {project_id}: NULL -> draft")
        elif old_status in status_mapping:
            new_status = status_mapping[old_status]
            if old_status != new_status:
                print(f"  Project {project_id}: {old_status} -> {new_status}")
        else:
            # Check if it's already a valid enum value
            valid_statuses = ['pending_approval', 'draft', 'submitted', 'under_review', 'evaluated', 'rejected']
            if old_status in valid_statuses:
                # Already valid, no change needed
                continue
            else:
                # Unknown status, default to draft
                new_status = 'draft'
                print(f"  Project {project_id}: {old_status} (unknown) -> draft")
        
        # Update the status if it changed
        if old_status != new_status:
            cursor.execute(
                "UPDATE projects SET status = ? WHERE id = ?",
                (new_status, project_id)
            )
            updated_count += 1
    
    conn.commit()
    
    if updated_count > 0:
        print(f"\n✓ Status migration completed! Updated {updated_count} projects.")
    else:
        print("\n✓ All project statuses are already up to date.")
    
    # Verify migration
    cursor.execute("SELECT DISTINCT status FROM projects")
    distinct_statuses = [row[0] for row in cursor.fetchall()]
    print(f"Current status values in database: {distinct_statuses}")
    
    return True


def validate_database(cursor):
    """
    Validate database integrity and provide summary.
    """
    print("\n" + "="*60)
    print("STEP 3: Validating database...")
    print("="*60)
    
    tables = [
        'users', 'students', 'admins', 'study_programs', 
        'projects', 'evaluations', 'evaluation_marks', 
        'deadlines', 'notifications'
    ]
    
    print("\nTable Status:")
    for table in tables:
        if check_table_exists(cursor, table):
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"  ✓ {table}: {count} records")
        else:
            print(f"  ✗ {table}: Table does not exist")
    
    # Check for required columns
    print("\nColumn Validation:")
    
    # Users table
    if check_table_exists(cursor, 'users'):
        required_user_cols = ['is_oauth_user', 'oauth_provider', 'oauth_subject']
        for col in required_user_cols:
            if check_column_exists(cursor, 'users', col):
                print(f"  ✓ users.{col}")
            else:
                print(f"  ✗ users.{col}: Missing")
    
    # Projects table
    if check_table_exists(cursor, 'projects'):
        required_project_cols = ['github_link', 'pdf_path', 'submitted_at', 'documentation_link']
        for col in required_project_cols:
            if check_column_exists(cursor, 'projects', col):
                print(f"  ✓ projects.{col}")
            else:
                print(f"  ✗ projects.{col}: Missing")
    
    # Evaluations table
    if check_table_exists(cursor, 'evaluations'):
        required_eval_cols = [
            'code_quality', 'documentation_score', 'functionality_score',
            'clarity_communication', 'visual_presentation', 'technical_explanation',
            'total_project_marks', 'total_presentation_marks', 'overall_percentage', 'grade'
        ]
        for col in required_eval_cols:
            if check_column_exists(cursor, 'evaluations', col):
                print(f"  ✓ evaluations.{col}")
            else:
                print(f"  ✗ evaluations.{col}: Missing")
    
    print("\n✓ Database validation completed!")


def run_comprehensive_migration():
    """
    Main migration function that runs all migration steps.
    """
    app = create_app()
    
    with app.app_context():
        # Get database path from config
        db_url = app.config['SQLALCHEMY_DATABASE_URI']
        
        # Extract path from SQLite URL
        if db_url.startswith('sqlite:///'):
            db_path = db_url.replace('sqlite:///', '')
            # Handle Windows paths
            if not os.path.isabs(db_path):
                db_path = os.path.join(os.path.dirname(__file__), db_path)
        else:
            print(f"Error: This script currently only supports SQLite databases.")
            print(f"Database URL: {db_url}")
            return False
        
        # Ensure instance directory exists
        instance_dir = os.path.dirname(db_path)
        if instance_dir and not os.path.exists(instance_dir):
            os.makedirs(instance_dir)
            print(f"Created instance directory: {instance_dir}")
        
        print("\n" + "="*60)
        print("COMPREHENSIVE DATABASE MIGRATION")
        print("="*60)
        print(f"Database: {db_path}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        if not os.path.exists(db_path):
            print(f"\n⚠ Warning: Database file does not exist: {db_path}")
            print("Please run 'flask db upgrade' first to create the database schema.")
            return False
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        try:
            # Step 1: Migrate schema (add missing columns)
            if not migrate_schema(cursor, conn):
                print("\n⚠ Schema migration failed. Please check the errors above.")
                return False
            
            # Step 2: Migrate status values
            if not migrate_status_to_enum(cursor, conn):
                print("\n⚠ Status migration failed. Please check the errors above.")
                return False
            
            # Step 3: Validate database
            validate_database(cursor)
            
            print("\n" + "="*60)
            print("✓ MIGRATION COMPLETED SUCCESSFULLY!")
            print("="*60)
            print("\nNext steps:")
            print("  1. Verify the database using the validation output above")
            print("  2. Test the application to ensure everything works correctly")
            print("  3. Consider backing up the database")
            
            return True
            
        except Exception as e:
            conn.rollback()
            print(f"\n✗ Migration error: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            conn.close()


if __name__ == '__main__':
    success = run_comprehensive_migration()
    sys.exit(0 if success else 1)

