#!/usr/bin/env python3
"""
Database Migration Script
Migrates project status from string to ProjectStatus enum
Maps old string values to new enum values:
- 'pending' -> 'draft'
- 'submitted' -> 'submitted'
- 'under_review' -> 'under_review'
- 'evaluated' -> 'evaluated'
- 'rejected' -> 'rejected' (if exists)
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models.models import Project, ProjectStatus
import sqlite3

def migrate_status_to_enum():
    app = create_app()
    
    with app.app_context():
        db_path = os.path.join(os.path.dirname(__file__), 'instance', 'dev.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        try:
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
                cursor.execute(
                    "UPDATE projects SET status = ? WHERE id = ?",
                    (new_status, project_id)
                )
                updated_count += 1
            
            conn.commit()
            print(f"\nMigration completed successfully! Updated {updated_count} projects.")
            
            # Verify migration
            cursor.execute("SELECT DISTINCT status FROM projects")
            distinct_statuses = [row[0] for row in cursor.fetchall()]
            print(f"\nCurrent status values in database: {distinct_statuses}")
            
        except Exception as e:
            conn.rollback()
            print(f"Migration error: {e}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            conn.close()

if __name__ == '__main__':
    migrate_status_to_enum()

