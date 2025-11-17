# HIT Project Evaluation System

A modern Student Evaluation System for managing project submissions, grading workflows, and academic reporting. The monorepo contains the **Next.js web dashboard** used by students and faculty plus the **Flask REST API** that powers authentication, program data, and evaluation logic.

## Table of Contents
1. [Architecture](#architecture)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Getting Started](#getting-started)
6. [Environment Configuration](#environment-configuration)
7. [Running the Apps](#running-the-apps)
8. [Testing & Linting](#testing--linting)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)
11. [Contributing](#contributing)
12. [License](#license)

---

## Architecture

```
Student Evaluation System
├── apps
│   ├── api      # Flask API (authentication, evaluations, programs, users)
│   └── web      # Next.js 15 App Router dashboard (faculty + student views)
├── docker       # docker-compose for full-stack dev
├── env.example  # base env template shared by services
└── setup.bat    # Windows helper for one-time setup
```

## Features

- Authenticated dashboards for students, faculty, and admins
- Project submission tracking with pending/evaluated views
- Evaluation workflows with scoring, comments, and status updates
- Deadlines, study programs, and analytics views
- Role-based navigation with protected routes
- REST API with schema validation using Marshmallow
- SQLite by default (use any SQLAlchemy-supported RDBMS)
- Dockerized for local dev parity
- Database migrations via Flask-Migrate

## Tech Stack

### Frontend (`apps/web`)
- [Next.js 15 App Router](https://nextjs.org/)
- React Server Components + Client Components
- Tailwind CSS, Radix UI primitives, Zustand stores
- REST client utilities for the Flask API

### Backend (`apps/api`)
- [Flask 3](https://flask.palletsprojects.com/)
- Flask SQLAlchemy, Marshmallow, Flask-Bcrypt, Flask-JWT-Extended
- Alembic / Flask-Migrate for migrations
- SQLite development DB (`instance/dev.db`)

## Prerequisites

- **Node.js 20+** (Next.js 15 requirement)
- **npm 10+** or **pnpm 9+** (pnpm recommended)
- **Python 3.11+** (project currently uses Python 3.13 in the venv)
- **pip** & **virtualenv** (`python -m venv`)
- **Git**
- Optional: **Docker** + **Docker Compose v2**

## Getting Started

### 1. Clone & install subprojects

```bash
git clone https://github.com/kudzanaidos5/HIT-Project-Evaluation-System.git
cd HIT-Project-Evaluation-System

# Frontend deps
cd apps/web
npm install          # or pnpm install

# Backend deps
cd ../api
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

### 2. Seed configuration

Copy the shared env template and customize credentials:

```bash
cp env.example .env          # repo-wide helpers
cp apps/api/.env.example apps/api/.env         # if provided
cp apps/web/.env.example apps/web/.env.local   # if provided
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

## Running the Apps

### Backend (Flask API)

```bash
cd apps/api
venv\Scripts\activate            # or source venv/bin/activate on macOS/Linux
flask db upgrade                 # run migrations
flask run --host=0.0.0.0 --port=5000
```

### Frontend (Next.js)

```bash
cd apps/web
npm run dev                      # or pnpm dev
# App served at http://localhost:3000
```

### Full stack via Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

Compose spins up the API, frontend, and any dependencies (db, reverse proxy). Customize ports in `docker/docker-compose.yml`.

## Testing & Linting

| Area | Command |
| --- | --- |
| Frontend lint | `npm run lint` |
| Frontend type-check | `npm run typecheck` |
| Frontend tests | `npm run test` (if configured) |
| Backend tests | `pytest` (todo: configure) |
| Backend formatting | `ruff check .` / `black .` (if added) |

## Deployment

- Build the Next.js app: `npm run build` (outputs `.next/standalone`)
- Containerize via `apps/web/Dockerfile`
- For the API, build `apps/api/Dockerfile` or run Gunicorn (`gunicorn wsgi:app`)
- Configure production database (PostgreSQL/MySQL) by updating `DATABASE_URL`
- Run migrations before swapping traffic: `flask db upgrade`

## Troubleshooting

- **Port conflicts**: change `PORT` in `.env.local` or `FLASK_RUN_PORT`
- **JWT errors**: ensure frontend `NEXT_PUBLIC_API_URL` matches backend origin
- **Static imports missing**: run `npm install` after pulling new commits
- **SQLite locked**: stop all Flask instances and delete `instance/dev.db`
- **Docker permission issues**: run `docker compose down -v` then `up --build`

## Contributing

1. Fork the repo & create a feature branch.
2. Run `npm run lint` and backend tests before opening a PR.
3. Describe context, screenshots, and migration steps in the PR template.
4. Ensure secrets are never committed (see `.gitignore` updates).

## License

This project is currently private to the HIT evaluation team. Contact the maintainers for licensing or usage details outside the institution.