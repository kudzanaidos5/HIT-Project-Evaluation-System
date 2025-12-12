# HIT Project Evaluation System

A modern Student Evaluation System for managing project submissions, grading workflows, and academic reporting. The monorepo contains the **Next.js web dashboard** used by students and faculty plus the **Flask REST API** that powers authentication, program data, and evaluation logic.

## Table of Contents
1. [Architecture](#architecture)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Getting Started](#getting-started)
6. [Environment Configuration](#environment-configuration)
7. [Database Seeding](#database-seeding)
8. [Database Migrations](#database-migrations)
9. [Running the Apps](#running-the-apps)
10. [User Roles & Permissions](#user-roles--permissions)
11. [Project Workflow](#project-workflow)
12. [Evaluation System](#evaluation-system)
13. [Testing & Linting](#testing--linting)
14. [Deployment](#deployment)
15. [Troubleshooting](#troubleshooting)
16. [Contributing](#contributing)
17. [License](#license)

---

## Architecture

```
Student Evaluation System
├── apps
│   ├── api      # Flask API (authentication, evaluations, programs, users)
│   └── web      # Next.js 15 App Router dashboard (faculty + student views)
├── docker       # docker-compose for full-stack dev
├── env.example  # base env template shared by services
├── setup.bat    # Windows helper for one-time setup
└── RESET_DB_AND_SEED.bat  # Database reset utility
```

## Features

### Core Functionality
- **Role-based Authentication**: Admin, Student, and Faculty roles with JWT-based authentication
- **Project Management**: Complete project lifecycle from creation to evaluation
- **Evaluation System**: Dual evaluation types (Project & Presentation) with detailed scoring
- **Deadline Management**: Level-based deadlines (200 & 400) with missed deadline tracking
- **Study Program Management**: Multi-level study programs with performance analytics
- **User Management**: Comprehensive user CRUD with deletion constraints
- **Analytics & Reporting**: Performance metrics, completion rates, and detailed reports

### Admin Features
- **Dashboard**: Overview of projects, evaluations, and system metrics
- **Project Details**: View student-submitted GitHub and documentation links
- **Quick Evaluation**: Inline evaluation modal for efficient grading
- **Missed Deadlines**: Track students who missed submission deadlines
- **Study Program Performance**: Performance metrics by study program and level
- **User Management**: Create, edit, and manage users with role assignment
- **Analytics**: Comprehensive analytics with charts and visualizations

### Student Features
- **Project Submission**: Submit GitHub and documentation links
- **Project Creation**: Create and manage project proposals
- **Status Tracking**: Monitor project approval and evaluation status
- **Dashboard**: Personal dashboard with project overview

### Recent Improvements
- ✅ Inline evaluation workflow on project details page
- ✅ Quick action buttons for missing evaluations
- ✅ Edit existing evaluations
- ✅ Enhanced project selection with search/filter
- ✅ Missed deadlines tracking by level
- ✅ Study program performance with level specification
- ✅ Visual indicators for items that cannot be deleted
- ✅ Improved error messages with detailed explanations
- ✅ Recent projects sorted by creation date

## Tech Stack

### Frontend (`apps/web`)
- [Next.js 14](https://nextjs.org/) with App Router
- React 18 with TypeScript
- Tailwind CSS for styling
- Zustand for state management
- React Query (TanStack Query) for data fetching
- Chart.js for analytics visualizations
- React Hook Form with Zod validation
- Axios for API communication

### Backend (`apps/api`)
- [Flask 3.0](https://flask.palletsprojects.com/)
- Flask-SQLAlchemy for ORM
- Flask-Migrate for database migrations
- Flask-JWT-Extended for authentication
- Flask-CORS for cross-origin requests
- Flask-Bcrypt for password hashing
- Marshmallow for schema validation
- ReportLab for PDF generation
- SQLite (development) / PostgreSQL/MySQL (production)

## Prerequisites

- **Node.js 20+** (Next.js 14 requirement)
- **npm 10+** or **pnpm 9+** (pnpm recommended)
- **Python 3.11+** (project currently uses Python 3.13 in the venv)
- **pip** & **virtualenv** (`python -m venv`)
- **Git**
- Optional: **Docker** + **Docker Compose v2**

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/kudzanaidos5/HIT-Project-Evaluation-System.git
cd HIT-Project-Evaluation-System

# Frontend dependencies
cd apps/web
npm install          # or pnpm install

# Backend dependencies
cd ../api
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

### 2. Environment Configuration

Copy the shared env template and customize credentials:

```bash
cp env.example .env          # repo-wide helpers
cp apps/api/.env.example apps/api/.env         # if provided
cp apps/web/.env.example apps/web/.env.local   # if provided
```

Or use the setup script (Windows):

```bash
setup.bat
```

Update secrets/signing keys, DB URLs, and API base URLs before running the stack.

## Environment Configuration

| File | Purpose |
| --- | --- |
| `env.example` | Shared variables (API URLs, default ports, feature flags) |
| `apps/api/.env` | Flask secrets, JWT settings, database URL |
| `apps/web/.env.local` | Next.js runtime configs (`NEXT_PUBLIC_API_URL`, etc.) |
| `apps/api/instance/dev.db` | SQLite dev database (ignored by Git) |

### Key Variables

```ini
# apps/api/.env
FLASK_APP=app
FLASK_ENV=development
SECRET_KEY=replace_me
JWT_SECRET_KEY=replace_me
DATABASE_URL=sqlite:///instance/dev.db

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000
AUTH_COOKIE_NAME=hit_eval_token
```

## Database Seeding

The system includes a seed script to populate the database with initial data:

```bash
cd apps/api
venv\Scripts\activate
python seed.py
```

This creates:
- **Admin User**: `admin@hit.ac.zw` / `Admin123!`
- **Sample Students**: 5 students with default password `Student123!`
- **Study Programs**: CS200, CS400, IT200, IT400, SE200, SE400, ISA200, ISA400
- **Sample Projects**: Projects for various students
- **Deadlines**: Initial deadlines for Level 200 and 400

To reset and reseed the database (Windows):

```bash
RESET_DB_AND_SEED.bat
```

## Database Migrations

The system uses Flask-Migrate for schema migrations and includes a comprehensive migration script for existing databases.

### Initial Setup (New Database)

For a fresh database setup:

```bash
cd apps/api
venv\Scripts\activate
flask db init              # First time only
flask db migrate -m "Initial migration"
flask db upgrade
```

### Existing Database Migration

If you have an existing database that needs updates (adding columns, migrating data, etc.):

```bash
cd apps/api
venv\Scripts\activate
python comprehensive_migration_script.py
```

This comprehensive script will:
- ✅ Add missing columns (OAuth fields, submission fields, scoring fields)
- ✅ Migrate project status values to enum format
- ✅ Validate database integrity

The script is **idempotent** and safe to run multiple times. For detailed information, see [`apps/api/MIGRATION_GUIDE.md`](apps/api/MIGRATION_GUIDE.md).

### Creating New Migrations

When you modify database models:

```bash
flask db migrate -m "Description of changes"
flask db upgrade
```

### Migration Files

- **`comprehensive_migration_script.py`**: Standalone executable script for migrating existing databases
- **`migrations/versions/comprehensive_migration.py`**: Reference documentation with complete schema
- **`MIGRATION_GUIDE.md`**: Detailed migration guide and troubleshooting

For more information, see [`apps/api/DATABASE_SETUP.md`](apps/api/DATABASE_SETUP.md).

## Running the Apps

### Backend (Flask API)

```bash
cd apps/api
venv\Scripts\activate            # or source venv/bin/activate on macOS/Linux
flask db upgrade                 # run migrations (first time only)
flask run --host=0.0.0.0 --port=5000
```

The API will be available at `http://localhost:5000`

### Frontend (Next.js)

```bash
cd apps/web
npm run dev                      # or pnpm dev
```

The app will be served at `http://localhost:3000`

### Full Stack via Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

Compose spins up the API, frontend, and any dependencies (db, reverse proxy). Customize ports in `docker/docker-compose.yml`.

## User Roles & Permissions

### Admin
- Full system access
- User management (create, edit, delete)
- Study program management
- Project approval/rejection
- Evaluation creation and editing
- Analytics and reporting
- Deadline management
- View missed deadlines

### Student
- Create and submit projects
- View own project status
- Submit GitHub and documentation links
- View evaluation results
- Personal dashboard

### Deletion Constraints

**Users cannot be deleted if:**
- They have associated projects (as a student)
- They have created evaluations (as an admin)

**Study Programs cannot be deleted if:**
- They have associated projects

The UI shows visual indicators (disabled delete buttons with tooltips) for items that cannot be deleted.

## Project Workflow

### Project Status Flow

1. **PENDING_APPROVAL**: Project created by student, awaiting admin approval
2. **DRAFT**: Approved but not submitted (no links provided)
3. **SUBMITTED**: Student has submitted GitHub and documentation links
4. **UNDER_REVIEW**: Being evaluated (first evaluation created)
5. **EVALUATED**: Fully evaluated (both project and presentation evaluations completed)
6. **REJECTED**: Rejected by admin

### Project Submission Process

1. Student creates project proposal
2. Admin approves/rejects the project
3. Student submits GitHub and documentation links
4. Admin evaluates the project (Project evaluation)
5. Admin evaluates the presentation (Presentation evaluation)
6. Project status updates to "Evaluated"

## Evaluation System

### Evaluation Types

1. **Project Evaluation**: Evaluates code quality, documentation, and functionality
2. **Presentation Evaluation**: Evaluates clarity, communication, and visual presentation

### Evaluation Criteria

- **Code Quality**: Code structure, best practices, maintainability
- **Documentation**: Documentation completeness and clarity
- **Functionality**: Feature implementation and correctness
- **Clarity & Communication**: Presentation clarity and communication skills
- **Visual Presentation**: Visual design and user interface

### Scoring

- Each criterion has a maximum score
- Total score is calculated automatically
- Grades are assigned based on score ranges
- Comments can be added for each criterion

## Testing & Linting

| Area | Command |
| --- | --- |
| Frontend lint | `npm run lint` |
| Frontend type-check | `npm run typecheck` |
| Frontend tests | `npm run test` (if configured) |
| Backend tests | `pytest` (todo: configure) |
| Backend formatting | `ruff check .` / `black .` (if added) |

## Deployment

### Frontend (Next.js)

```bash
cd apps/web
npm run build                    # Build the application
npm run start                    # Start production server
```

Or containerize via `apps/web/Dockerfile`:

```bash
docker build -t hit-eval-web apps/web
```

### Backend (Flask API)

For production, use Gunicorn:

```bash
gunicorn wsgi:app --bind 0.0.0.0:5000 --workers 4
```

Or containerize via `apps/api/Dockerfile`:

```bash
docker build -t hit-eval-api apps/api
```

### Production Checklist

- [ ] Configure production database (PostgreSQL/MySQL) by updating `DATABASE_URL`
- [ ] Run migrations before deploying: `flask db upgrade`
- [ ] Set secure `SECRET_KEY` and `JWT_SECRET_KEY`
- [ ] Configure CORS for production domain
- [ ] Set up SSL/TLS certificates
- [ ] Configure environment variables
- [ ] Set up backup strategy for database
- [ ] Configure logging and monitoring

## Troubleshooting

### Common Issues

**Port conflicts**
- Change `PORT` in `.env.local` or `FLASK_RUN_PORT`
- Default ports: Frontend (3000), Backend (5000)

**JWT errors**
- Ensure frontend `NEXT_PUBLIC_API_URL` matches backend origin
- Check JWT secret keys match in both environments
- Clear browser cookies and localStorage

**Database issues**
- **SQLite locked**: Stop all Flask instances and delete `instance/dev.db`
- **Missing columns**: Run `python comprehensive_migration_script.py` to add missing columns
- **Schema out of date**: Run migrations: `flask db upgrade`
- **Reset database**: Use `RESET_DB_AND_SEED.bat` (Windows)
- For detailed troubleshooting, see [`apps/api/DATABASE_SETUP.md`](apps/api/DATABASE_SETUP.md)

**Static imports missing**
- Run `npm install` after pulling new commits
- Clear `.next` folder and rebuild: `rm -rf .next && npm run build`

**Docker permission issues**
- Run `docker compose down -v` then `up --build`
- Check Docker daemon is running

**User deletion fails**
- Check if user has projects: View user details in admin panel
- Check if user has evaluations: View evaluation count
- Error messages will indicate the specific reason

**Study program deletion fails**
- Check project count in study program details
- Projects must be deleted or reassigned first

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List all projects (with filters)
- `GET /api/projects/<id>` - Get project details
- `POST /api/projects` - Create project (student)
- `PUT /api/projects/<id>` - Update project
- `POST /api/projects/<id>/approve` - Approve project (admin)
- `POST /api/projects/<id>/reject` - Reject project (admin)

### Evaluations
- `GET /api/evaluations` - List evaluations
- `GET /api/evaluations/<id>` - Get evaluation details
- `POST /api/evaluations` - Create evaluation (admin)
- `PUT /api/evaluations/<id>` - Update evaluation (admin)

### Users
- `GET /api/users` - List users (admin)
- `GET /api/users/<id>` - Get user details
- `POST /api/users` - Create user (admin)
- `PUT /api/users/<id>` - Update user (admin)
- `DELETE /api/users/<id>` - Delete user (admin, with constraints)

### Study Programs
- `GET /api/study-programs` - List study programs
- `POST /api/study-programs` - Create study program (admin)
- `PUT /api/study-programs/<id>` - Update study program (admin)
- `DELETE /api/study-programs/<id>` - Delete study program (admin, with constraints)

### Analytics
- `GET /api/analytics/averages` - Get average scores
- `GET /api/analytics/completion-rate` - Get completion rates
- `GET /api/analytics/performance-by-study-program` - Study program performance
- `GET /api/analytics/pipeline` - Project pipeline status
- `GET /api/analytics/top-projects` - Top performing projects

### Deadlines
- `GET /api/deadlines` - List deadlines
- `POST /api/deadlines` - Create deadline (admin)
- `PUT /api/deadlines/<id>` - Update deadline (admin)
- `GET /api/deadlines/missed` - Get missed deadlines (admin)

## Contributing

1. Fork the repo & create a feature branch
2. Run `npm run lint` and backend tests before opening a PR
3. Describe context, screenshots, and migration steps in the PR template
4. Ensure secrets are never committed (see `.gitignore` updates)
5. Follow the existing code style and conventions
6. Add tests for new features
7. Update documentation as needed

## License

This project is currently private to the HIT evaluation team. Contact the maintainers for licensing or usage details outside the institution.

---

## Support

For issues, questions, or contributions, please contact the development team or open an issue in the repository.

**Default Admin Credentials:**
- Email: `admin@hit.ac.zw`
- Password: `Admin123!`

**Default Student Credentials:**
- Email: `[student_email]@hit.ac.zw`
- Password: `Student123!`

*Note: Change default passwords in production environments.*
