#!/usr/bin/env python3
"""
Script to check and fix admin user credentials
Useful for debugging login issues
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models.models import User, UserRole

def check_and_fix_admin():
    app = create_app()
    
    with app.app_context():
        # Check if admin user exists
        admin_user = User.query.filter_by(email='admin@hit.ac.zw').first()
        
        if not admin_user:
            print("❌ Admin user not found!")
            print("Creating admin user...")
            admin_user = User(
                name='System Administrator',
                email='admin@hit.ac.zw',
                role=UserRole.ADMIN
            )
            admin_user.set_password('Admin123!')
            db.session.add(admin_user)
            db.session.commit()
            print("✅ Admin user created!")
            print("   Email: admin@hit.ac.zw")
            print("   Password: Admin123!")
        else:
            print("✅ Admin user exists!")
            print(f"   ID: {admin_user.id}")
            print(f"   Name: {admin_user.name}")
            print(f"   Email: {admin_user.email}")
            print(f"   Role: {admin_user.role.value}")
            print(f"   Is OAuth User: {admin_user.is_oauth_user}")
            print(f"   Password Hash Present: {bool(admin_user.password_hash)}")
            
            # Reset password to default
            reset = input("\nReset password to 'Admin123!'? (y/n): ").lower().strip()
            if reset == 'y':
                admin_user.set_password('Admin123!')
                db.session.commit()
                print("✅ Password reset to: Admin123!")
        
        # Check total user count
        total_users = User.query.count()
        print(f"\n📊 Total users in database: {total_users}")
        
        # List all users
        all_users = User.query.all()
        if all_users:
            print("\n📋 All users:")
            for user in all_users:
                print(f"   - {user.email} ({user.role.value})")
        
        print("\n✅ Check complete!")

if __name__ == '__main__':
    check_and_fix_admin()

