#!/usr/bin/env python3
"""
Seed script for Study Programs
Creates the initial study programs as specified
"""

import sys
import os
from datetime import datetime

# Adjust the path to import from the parent directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models.models import StudyProgram

def seed_study_programs():
    app = create_app()
    
    with app.app_context():
        print("Starting study programs seeding...")
        
        # Study programs data from the requirements
        study_programs_data = [
            {
                'code': 'CS200',
                'name': 'Computer Science',
                'description': None,  # "No description" in the image
                'created_at': datetime(2025, 11, 17)
            },
            {
                'code': 'CS400',
                'name': 'Computer Science',
                'description': 'Level400',
                'created_at': datetime(2025, 11, 17)
            },
            {
                'code': 'IT200',
                'name': 'Information and Technology',
                'description': 'Level 200',
                'created_at': datetime(2025, 11, 17)
            },
            {
                'code': 'IT400',
                'name': 'Information and Technology',
                'description': 'Level 400',
                'created_at': datetime(2025, 11, 17)
            },
            {
                'code': 'SE200',
                'name': 'Software Engineering',
                'description': 'Level 200',
                'created_at': datetime(2025, 11, 17)
            },
            {
                'code': 'SE400',
                'name': 'Software Engineering',
                'description': 'level 400',
                'created_at': datetime(2025, 11, 25)
            },
            {
                'code': 'ISA200',
                'name': 'Information Security and Assurance',
                'description': 'Level 200',
                'created_at': datetime(2025, 11, 29)
            },
            {
                'code': 'ISA400',
                'name': 'Information Security and Assurance',
                'description': 'Level 400',
                'created_at': datetime(2025, 11, 29)
            },
        ]
        
        created_count = 0
        skipped_count = 0
        
        for program_data in study_programs_data:
            # Check if program already exists
            existing_program = StudyProgram.query.filter_by(code=program_data['code']).first()
            
            if existing_program:
                print(f"⏭️  Skipping {program_data['code']} - already exists")
                skipped_count += 1
            else:
                # Create the study program
                study_program = StudyProgram(
                    code=program_data['code'],
                    name=program_data['name'],
                    description=program_data['description'],
                    created_at=program_data['created_at']
                )
                db.session.add(study_program)
                created_count += 1
                print(f"✅ Created {program_data['code']} - {program_data['name']}")
        
        db.session.commit()
        
        print("\n" + "="*50)
        print("📚 Study Programs Seeding Complete!")
        print("="*50)
        print(f"✅ Created: {created_count} programs")
        print(f"⏭️  Skipped: {skipped_count} programs (already exist)")
        print(f"📊 Total: {len(study_programs_data)} programs")
        print("="*50)

if __name__ == '__main__':
    seed_study_programs()

