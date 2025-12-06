#!/usr/bin/env python3
"""
Seed script for HIT Project Evaluation System
Creates initial admin user, study programs, students, and sample projects
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models.models import User, UserRole, StudyProgram, Project, ProjectLevel, Student, Admin, Deadline, ProjectStatus
from datetime import datetime, timedelta

def seed_database():
    app = create_app()
    
    with app.app_context():
        # Create tables
        db.create_all()
        
        # Create admin user
        admin_user = User.query.filter_by(email='admin@hit.ac.zw').first()
        if not admin_user:
            admin_user = User(
                name='System Administrator',
                email='admin@hit.ac.zw',
                role=UserRole.ADMIN
            )
            admin_user.set_password('Admin123!')
            db.session.add(admin_user)
            db.session.flush()  # Get the user ID
            
            # Create admin profile
            admin_profile = Admin(user_id=admin_user.id, department='IT Administration')
            db.session.add(admin_profile)
        
        # Create sample students
        students_data = [
            {'name': 'John Doe', 'email': 'john.doe@hit.ac.zw', 'student_id': 'H230001A'},
            {'name': 'Jane Smith', 'email': 'jane.smith@hit.ac.zw', 'student_id': 'H230002B'},
            {'name': 'Mike Johnson', 'email': 'mike.johnson@hit.ac.zw', 'student_id': 'H230003C'},
            {'name': 'Sarah Wilson', 'email': 'sarah.wilson@hit.ac.zw', 'student_id': 'H230004D'},
            {'name': 'David Brown', 'email': 'david.brown@hit.ac.zw', 'student_id': 'H230005E'},
        ]
        
        for student_data in students_data:
            user = User.query.filter_by(email=student_data['email']).first()
            if not user:
                user = User(
                    name=student_data['name'],
                    email=student_data['email'],
                    role=UserRole.STUDENT
                )
                user.set_password('Student123!')
                db.session.add(user)
                db.session.flush()
                
                student_profile = Student(
                    user_id=user.id,
                    student_id=student_data['student_id'],
                    department='Computer Science'
                )
                db.session.add(student_profile)
        
        # Create study programs
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
        
        for study_program_data in study_programs_data:
            study_program = StudyProgram.query.filter_by(code=study_program_data['code']).first()
            if not study_program:
                # Extract created_at if provided, otherwise use default
                created_at = study_program_data.pop('created_at', None)
                study_program = StudyProgram(**study_program_data)
                if created_at:
                    study_program.created_at = created_at
                db.session.add(study_program)
        
        db.session.commit()
        
        # Create sample projects
        projects_data = [
            {
                'title': 'IoT Smart Campus System',
                'description': 'A comprehensive IoT solution for campus management',
                'level': ProjectLevel.LEVEL_400,
                'course_code': 'CS400',
                'student_email': 'john.doe@hit.ac.zw'
            },
            {
                'title': 'Mobile Banking Application',
                'description': 'Secure mobile banking app with biometric authentication',
                'level': ProjectLevel.LEVEL_200,
                'course_code': 'CS200',
                'student_email': 'jane.smith@hit.ac.zw'
            },
            {
                'title': 'E-Learning Platform',
                'description': 'Online learning management system',
                'level': ProjectLevel.LEVEL_400,
                'course_code': 'IT400',
                'student_email': 'mike.johnson@hit.ac.zw'
            },
            {
                'title': 'Inventory Management System',
                'description': 'Database-driven inventory tracking system',
                'level': ProjectLevel.LEVEL_200,
                'course_code': 'IT200',
                'student_email': 'sarah.wilson@hit.ac.zw'
            },
            {
                'title': 'Network Security Scanner',
                'description': 'Automated network vulnerability assessment tool',
                'level': ProjectLevel.LEVEL_400,
                'course_code': 'ISA400',
                'student_email': 'david.brown@hit.ac.zw'
            },
        ]
        
        for project_data in projects_data:
            study_program = StudyProgram.query.filter_by(code=project_data['course_code']).first()
            student_user = User.query.filter_by(email=project_data['student_email']).first()
            
            if study_program and student_user and student_user.student_profile:
                project = Project(
                    title=project_data['title'],
                    description=project_data['description'],
                    level=project_data['level'],
                    study_program_id=study_program.id,
                    student_id=student_user.student_profile.id,
                    status=ProjectStatus.PENDING_APPROVAL
                )
                db.session.add(project)
        
        # Create initial deadlines
        deadline_200 = Deadline.query.filter_by(level=ProjectLevel.LEVEL_200).first()
        if not deadline_200:
            deadline_200 = Deadline(
                level=ProjectLevel.LEVEL_200,
                deadline=datetime.utcnow() + timedelta(days=30)
            )
            db.session.add(deadline_200)
        
        deadline_400 = Deadline.query.filter_by(level=ProjectLevel.LEVEL_400).first()
        if not deadline_400:
            deadline_400 = Deadline(
                level=ProjectLevel.LEVEL_400,
                deadline=datetime.utcnow() + timedelta(days=45)
            )
            db.session.add(deadline_400)
        
        db.session.commit()
        
        print("✅ Database seeded successfully!")
        print("📧 Admin login: admin@hit.ac.zw / Admin123!")
        print("👥 Student logins: [student_email] / Student123!")
        print("📚 Created study programs:", len(study_programs_data))
        print("🎓 Created students:", len(students_data))
        print("📋 Created projects:", len(projects_data))
        print("⏰ Created deadlines for Level 200 and 400")

if __name__ == '__main__':
    seed_database()
