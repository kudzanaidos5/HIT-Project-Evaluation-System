# Database Setup Guide

This guide will help you set up and initialize the database for the Student Evaluation System.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Database Migrations](#database-migrations)
- [Seeding the Database](#seeding-the-database)
- [Common Commands](#common-commands)
- [Troubleshooting](#troubleshooting)
- [Docker Setup](#docker-setup)

## Prerequisites

Before setting up the database, ensure you have:

1. **Python 3.11+** installed
2. **Virtual environment** activated (recommended)
3. **All dependencies** installed:
   ```bash
   pip install -r requirements.txt
   ```
4. **Environment variables** configured (see `.env` file or `env.example`)

## Initial Setup

### Step 1: Activate Virtual Environment

```bash
# Windows
.\venv\Scripts\Activate.ps1

# Linux/Mac
source venv/bin/activate
```

### Step 2: Set Flask Application

```bash
# Windows PowerShell
$env:FLASK_APP="wsgi.py"

# Linux/Mac
export FLASK_APP=wsgi.py
```

### Step 3: Initialize Flask-Migrate (First Time Only)

If this is the first time setting up the database, initialize Flask-Migrate:

```bash
flask db init
```

This creates the `migrations` folder with the necessary migration infrastructure.

**Note**: If you encounter errors about the database path, the configuration has been updated to handle paths with spaces automatically.

### Step 4: Create Initial Migration

Create the initial migration based on your models:

```bash
flask db migrate -m "Initial migration"
```

This will generate a migration file in `migrations/versions/` that contains all your database schema.

### Step 5: Apply Migrations

Apply the migration to create the database tables:

```bash
flask db upgrade
```

The database file will be created at `instance/dev.db` (or the path specified in your `DATABASE_URL`).

## Database Migrations

### Creating New Migrations

When you modify your models, create a new migration:

```bash
flask db migrate -m "Description of changes"
```

Review the generated migration file in `migrations/versions/` before applying it.

### Applying Migrations

Apply all pending migrations:

```bash
flask db upgrade
```

### Rolling Back Migrations

To rollback the last migration:

```bash
flask db downgrade
```

To rollback to a specific revision:

```bash
flask db downgrade <revision_id>
```

### Checking Migration Status

View the current database version:

```bash
flask db current
```

View migration history:

```bash
flask db history
```

## Seeding the Database

After setting up the database schema, you can seed it with initial data.

### Option 1: Full Seed (Recommended for Development)

This creates admin users, study programs, students, and sample projects:

```bash
python seed.py
```

**Default Admin Credentials:**
- Email: `admin@hit.ac.zw`
- Password: `Admin123!`

**Note**: Change the admin password immediately in production!

### Option 2: Seed Study Programs Only

If you only need to add study programs:

```bash
python seed_study_programs.py
```

### What Gets Seeded

The `seed.py` script creates:

1. **Admin User**
   - Email: `admin@hit.ac.zw`
   - Password: `Admin123!`
   - Department: IT Administration

2. **Study Programs**
   - Computer Science (CS200)
   - Information Technology (IT200)
   - Software Engineering (SE200)
   - And more...

3. **Sample Students**
   - 5 sample students with student IDs
   - Default password: `Student123!`

4. **Sample Projects**
   - Various projects at different levels (200, 400)
   - Different statuses (pending, approved, etc.)

5. **Deadlines**
   - Deadlines for Level 200 and 400 projects

## Common Commands

### Quick Setup (First Time)

```bash
# 1. Initialize migrations (first time only)
flask db init

# 2. Create initial migration
flask db migrate -m "Initial migration"

# 3. Apply migration
flask db upgrade

# 4. Seed database
python seed.py
```

### Daily Development

```bash
# After model changes
flask db migrate -m "Description"
flask db upgrade

# Check current version
flask db current
```

### Reset Database (Development Only)

**⚠️ Warning**: This will delete all data!

```bash
# Delete the database file
rm instance/dev.db  # Linux/Mac
del instance\dev.db  # Windows

# Recreate from migrations
flask db upgrade

# Reseed data
python seed.py
```

## Troubleshooting

### Error: "Path doesn't exist: migrations"

**Solution**: Initialize Flask-Migrate first:
```bash
flask db init
```

### Error: "unable to open database file"

**Possible Causes & Solutions**:

1. **Instance directory doesn't exist**
   ```bash
   mkdir instance  # Linux/Mac
   mkdir instance  # Windows PowerShell
   ```

2. **Path issues with spaces**
   - The configuration has been updated to handle paths with spaces
   - Ensure you're using the latest version of `app/config.py`

3. **Permissions issue**
   - Check that you have write permissions in the project directory
   - On Windows, try running as administrator if needed

### Error: "Target database is not up to date"

**Solution**: Apply pending migrations:
```bash
flask db upgrade
```

### Error: "Can't locate revision identified by..."

**Solution**: This usually means the database and migration files are out of sync. Options:

1. **If in development** (data loss acceptable):
   ```bash
   # Delete database and recreate
   rm instance/dev.db
   flask db upgrade
   python seed.py
   ```

2. **If you need to preserve data**:
   - Manually sync the database version in the `alembic_version` table
   - Or use `flask db stamp head` to mark current state

### Migration Conflicts

If you have conflicts between migration files:

1. Check migration history: `flask db history`
2. Identify the conflict point
3. Manually merge migrations or reset if in development

### Database Locked Error (SQLite)

SQLite databases can get locked if:
- Another process is using the database
- A previous process didn't close properly

**Solution**: 
- Close all connections to the database
- Restart your application
- If persistent, delete the database file and recreate

## Docker Setup

If you're using Docker, the database setup is slightly different:

### Using Docker Compose

1. **Start the containers**:
   ```bash
   cd ../../docker
   docker-compose up -d
   ```

2. **Access the API container**:
   ```bash
   docker exec -it student-eval-api bash
   ```

3. **Inside the container, run migrations**:
   ```bash
   flask db upgrade
   python seed.py
   ```

### Database Persistence

The database is stored in a Docker volume (`api_db_data`), so data persists even if containers are stopped.

To reset the database in Docker:
```bash
docker-compose down -v  # Removes volumes
docker-compose up --build
```

## Environment Variables

Ensure these environment variables are set (in `.env` file):

```env
DATABASE_URL=sqlite:///instance/dev.db
FLASK_ENV=development
FLASK_DEBUG=True
FLASK_SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret-key-here
```

For production, use PostgreSQL:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/hit_evaluation
```

## Additional Scripts

### comprehensive_migration_script.py

Comprehensive migration script that consolidates all database migration operations:
- Adds missing columns (OAuth fields, submission fields, scoring fields)
- Migrates project status values to enum format
- Validates database integrity

**Usage:**
```bash
python comprehensive_migration_script.py
```

This script is idempotent and safe to run multiple times. For detailed information, see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

**Note**: For new schema changes, use Flask-Migrate instead:
```bash
flask db migrate -m "Description of changes"
flask db upgrade
```

## Best Practices

1. **Always review migrations** before applying them
2. **Commit migration files** to version control
3. **Test migrations** on a copy of production data before applying
4. **Backup database** before major migrations
5. **Use descriptive migration messages**: `flask db migrate -m "Add user profile fields"`
6. **Never edit applied migrations** - create new ones instead
7. **Keep migrations small and focused** - one logical change per migration

## Getting Help

If you encounter issues:

1. Check the error message carefully
2. Review the [Troubleshooting](#troubleshooting) section
3. Check Flask-Migrate documentation: https://flask-migrate.readthedocs.io/
4. Verify your environment variables are set correctly
5. Ensure all dependencies are installed

## Next Steps

After setting up the database:

1. Start the Flask development server: `python wsgi.py`
2. Access the API at `http://localhost:5000`
3. Test the health endpoint: `http://localhost:5000/api/health`
4. Log in with the default admin credentials to verify setup

---

**Last Updated**: December 2025

