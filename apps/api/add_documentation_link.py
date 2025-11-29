#!/usr/bin/env python3
"""
Quick script to add documentation_link column to projects table
Uses SQLAlchemy which may work even if server is running
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from sqlalchemy import text, inspect

def add_documentation_link():
    app = create_app()
    
    with app.app_context():
        try:
            # Check if column exists
            inspector = inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('projects')]
            
            if 'documentation_link' not in columns:
                print("Adding documentation_link column to projects table...")
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE projects ADD COLUMN documentation_link VARCHAR(500)"))
                    conn.commit()
                print("Column added successfully!")
            else:
                print("Column documentation_link already exists.")
                
        except Exception as e:
            print(f"Error: {e}")
            print("\nNote: If you see 'database is locked', please stop the Flask server first.")
            raise

if __name__ == '__main__':
    add_documentation_link()

