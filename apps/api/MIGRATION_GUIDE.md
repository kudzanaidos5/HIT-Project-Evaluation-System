# Database Migration Guide

This guide explains how to use the comprehensive migration files for the Student Evaluation System.

## Migration Files Overview

### 1. `migrations/versions/comprehensive_migration.py`
- **Type**: Alembic migration file
- **Purpose**: Reference documentation and schema definition
- **Contains**: Complete database schema with all tables, columns, constraints, and relationships
- **Usage**: Reference only (not meant to be applied as a migration)

### 2. `comprehensive_migration_script.py`
- **Type**: Standalone Python script
- **Purpose**: Executable migration script
- **Contains**: All migration logic including schema updates, status migration, and validation
- **Usage**: Run directly to migrate existing databases

## Quick Start

### For New Databases

If you're setting up a fresh database:

```bash
# 1. Initialize Flask-Migrate (first time only)
flask db init

# 2. Create initial migration
flask db migrate -m "Initial migration"

# 3. Apply migration
flask db upgrade

# 4. (Optional) Run comprehensive migration script to ensure all columns exist
python comprehensive_migration_script.py
```

### For Existing Databases

If you have an existing database that needs updates:

```bash
# Run the comprehensive migration script
python comprehensive_migration_script.py
```

This script will:
1. ✅ Check and add any missing columns
2. ✅ Migrate project status values to enum format
3. ✅ Validate database integrity

## What Gets Migrated

### Schema Changes

#### Users Table
- `is_oauth_user` (BOOLEAN) - Indicates if user signed up via OAuth
- `oauth_provider` (VARCHAR(50)) - OAuth provider name (e.g., 'google')
- `oauth_subject` (VARCHAR(255)) - OAuth subject identifier

#### Projects Table
- `github_link` (VARCHAR(500)) - GitHub repository URL
- `documentation_link` (VARCHAR(500)) - Documentation URL (Google Drive, etc.)
- `pdf_path` (VARCHAR(500)) - Path to uploaded PDF file
- `submitted_at` (DATETIME) - Timestamp when project was submitted

#### Evaluations Table
- `code_quality` (FLOAT) - Code quality score
- `documentation_score` (FLOAT) - Documentation score
- `functionality_score` (FLOAT) - Functionality score
- `clarity_communication` (FLOAT) - Presentation clarity score
- `visual_presentation` (FLOAT) - Visual presentation score
- `technical_explanation` (FLOAT) - Technical explanation score
- `total_project_marks` (FLOAT) - Total project marks
- `total_presentation_marks` (FLOAT) - Total presentation marks
- `overall_percentage` (FLOAT) - Overall percentage score
- `grade` (VARCHAR(5)) - Letter grade (A, B, C, D, F)

### Data Migrations

#### Project Status Migration
The script migrates old status values to new enum values:
- `pending` → `draft`
- `submitted` → `submitted`
- `under_review` → `under_review`
- `evaluated` → `evaluated`
- `rejected` → `rejected`
- `NULL` → `draft`

## Database Schema Reference

### Tables

1. **users** - Core user authentication
2. **admins** - Admin profiles
3. **students** - Student profiles
4. **study_programs** - Academic programs
5. **projects** - Student project submissions
6. **evaluations** - Project and presentation evaluations
7. **evaluation_marks** - Detailed criterion marks
8. **deadlines** - Project submission deadlines
9. **notifications** - System notifications

### Relationships

```
User (1) ──< (1) Student
User (1) ──< (1) Admin
Student (1) ──< (*) Project
StudyProgram (1) ──< (*) Project
Project (1) ──< (*) Evaluation
Evaluation (1) ──< (*) EvaluationMark
User (1) ──< (*) Evaluation (as evaluator)
User (1) ──< (*) Notification
```

### Enums

- **UserRole**: `ADMIN`, `STUDENT`
- **ProjectLevel**: `LEVEL_200` (200), `LEVEL_400` (400)
- **ProjectStatus**: `pending_approval`, `draft`, `submitted`, `under_review`, `evaluated`, `rejected`
- **EvaluationType**: `PROJECT`, `PRESENTATION`
- **NotificationType**: `SUCCESS`, `ERROR`, `INFO`, `WARNING`
- **NotificationAudience**: `ADMIN`, `STUDENT`, `ALL`

## Troubleshooting

### Error: "Table does not exist"

**Solution**: Run Flask-Migrate first to create the base schema:
```bash
flask db upgrade
```

### Error: "Database is locked"

**Solution**: 
- Close all connections to the database
- Restart your application
- If persistent, check for other processes using the database

### Error: "Column already exists"

**Solution**: This is normal. The script is idempotent and will skip columns that already exist.

### Migration Script Fails

**Solution**:
1. Check the error message carefully
2. Ensure the database file exists and is accessible
3. Verify you have write permissions
4. Check that Flask-Migrate has been run first
5. Review the validation output to see what's missing

## Best Practices

1. **Backup First**: Always backup your database before running migrations
   ```bash
   cp instance/dev.db instance/dev.db.backup
   ```

2. **Test in Development**: Test migrations on a development database first

3. **Review Changes**: The script will print what it's doing - review the output

4. **Run Validation**: The script includes validation - review the output to ensure everything is correct

5. **Version Control**: Commit migration files to version control

## Manual Migration

If you need to manually add columns, you can use SQLite directly:

```sql
-- Add OAuth columns to users
ALTER TABLE users ADD COLUMN is_oauth_user BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50);
ALTER TABLE users ADD COLUMN oauth_subject VARCHAR(255);

-- Add submission fields to projects
ALTER TABLE projects ADD COLUMN github_link VARCHAR(500);
ALTER TABLE projects ADD COLUMN documentation_link VARCHAR(500);
ALTER TABLE projects ADD COLUMN pdf_path VARCHAR(500);
ALTER TABLE projects ADD COLUMN submitted_at DATETIME;

-- Add scoring fields to evaluations
ALTER TABLE evaluations ADD COLUMN code_quality FLOAT;
ALTER TABLE evaluations ADD COLUMN documentation_score FLOAT;
ALTER TABLE evaluations ADD COLUMN functionality_score FLOAT;
ALTER TABLE evaluations ADD COLUMN clarity_communication FLOAT;
ALTER TABLE evaluations ADD COLUMN visual_presentation FLOAT;
ALTER TABLE evaluations ADD COLUMN technical_explanation FLOAT;
ALTER TABLE evaluations ADD COLUMN total_project_marks FLOAT;
ALTER TABLE evaluations ADD COLUMN total_presentation_marks FLOAT;
ALTER TABLE evaluations ADD COLUMN overall_percentage FLOAT;
ALTER TABLE evaluations ADD COLUMN grade VARCHAR(5);
```

## Verification

After running the migration, verify everything is correct:

```bash
# Check migration status
flask db current

# View migration history
flask db history

# Run the comprehensive script to validate
python comprehensive_migration_script.py
```

## Support

For issues or questions:
1. Check the error messages in the script output
2. Review the validation section output
3. Check the database file permissions
4. Ensure all dependencies are installed

---

**Last Updated**: December 2025

