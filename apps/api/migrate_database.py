#!/usr/bin/env python3
"""
Database Migration Script
Adds new columns to existing tables
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
import sqlite3

def migrate_database():
    app = create_app()
    
    with app.app_context():
        db_path = os.path.join(os.path.dirname(__file__), 'instance', 'dev.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        try:
            # Check if columns exist and add them if they don't
            cursor.execute("PRAGMA table_info(users)")
            user_columns = [row[1] for row in cursor.fetchall()]

            if 'is_oauth_user' not in user_columns:
                print("Adding is_oauth_user column to users table...")
                cursor.execute("ALTER TABLE users ADD COLUMN is_oauth_user BOOLEAN DEFAULT 0")

            if 'oauth_provider' not in user_columns:
                print("Adding oauth_provider column to users table...")
                cursor.execute("ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50)")

            if 'oauth_subject' not in user_columns:
                print("Adding oauth_subject column to users table...")
                cursor.execute("ALTER TABLE users ADD COLUMN oauth_subject VARCHAR(255)")

            cursor.execute("PRAGMA table_info(projects)")
            project_columns = [row[1] for row in cursor.fetchall()]
            
            if 'github_link' not in project_columns:
                print("Adding github_link column to projects table...")
                cursor.execute("ALTER TABLE projects ADD COLUMN github_link VARCHAR(500)")
            
            if 'pdf_path' not in project_columns:
                print("Adding pdf_path column to projects table...")
                cursor.execute("ALTER TABLE projects ADD COLUMN pdf_path VARCHAR(500)")
            
            if 'submitted_at' not in project_columns:
                print("Adding submitted_at column to projects table...")
                cursor.execute("ALTER TABLE projects ADD COLUMN submitted_at DATETIME")
            
            if 'documentation_link' not in project_columns:
                print("Adding documentation_link column to projects table...")
                cursor.execute("ALTER TABLE projects ADD COLUMN documentation_link VARCHAR(500)")
            
            # Check evaluations table
            cursor.execute("PRAGMA table_info(evaluations)")
            eval_columns = [row[1] for row in cursor.fetchall()]
            
            if 'code_quality' not in eval_columns:
                print("Adding code_quality column to evaluations table...")
                cursor.execute("ALTER TABLE evaluations ADD COLUMN code_quality FLOAT")
            
            if 'documentation_score' not in eval_columns:
                print("Adding documentation_score column to evaluations table...")
                cursor.execute("ALTER TABLE evaluations ADD COLUMN documentation_score FLOAT")
            
            if 'functionality_score' not in eval_columns:
                print("Adding functionality_score column to evaluations table...")
                cursor.execute("ALTER TABLE evaluations ADD COLUMN functionality_score FLOAT")
            
            if 'clarity_communication' not in eval_columns:
                print("Adding clarity_communication column to evaluations table...")
                cursor.execute("ALTER TABLE evaluations ADD COLUMN clarity_communication FLOAT")
            
            if 'visual_presentation' not in eval_columns:
                print("Adding visual_presentation column to evaluations table...")
                cursor.execute("ALTER TABLE evaluations ADD COLUMN visual_presentation FLOAT")
            
            if 'technical_explanation' not in eval_columns:
                print("Adding technical_explanation column to evaluations table...")
                cursor.execute("ALTER TABLE evaluations ADD COLUMN technical_explanation FLOAT")
            
            if 'total_project_marks' not in eval_columns:
                print("Adding total_project_marks column to evaluations table...")
                cursor.execute("ALTER TABLE evaluations ADD COLUMN total_project_marks FLOAT")
            
            if 'total_presentation_marks' not in eval_columns:
                print("Adding total_presentation_marks column to evaluations table...")
                cursor.execute("ALTER TABLE evaluations ADD COLUMN total_presentation_marks FLOAT")
            
            if 'overall_percentage' not in eval_columns:
                print("Adding overall_percentage column to evaluations table...")
                cursor.execute("ALTER TABLE evaluations ADD COLUMN overall_percentage FLOAT")
            
            if 'grade' not in eval_columns:
                print("Adding grade column to evaluations table...")
                cursor.execute("ALTER TABLE evaluations ADD COLUMN grade VARCHAR(5)")
            
            conn.commit()
            print("Database migration completed successfully!")
            
        except Exception as e:
            conn.rollback()
            print(f"Migration error: {e}")
            raise
        finally:
            conn.close()

if __name__ == '__main__':
    migrate_database()

