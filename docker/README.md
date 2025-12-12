# Docker Setup for Student Evaluation System

This directory contains the Docker configuration for running the Student Evaluation System.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- At least 4GB of available RAM
- Ports 3000 and 5000 available on your machine

## Quick Start

1. **Create a `.env` file** in the project root (copy from `env.example`):
   ```bash
   cp env.example .env
   ```

2. **Update the `.env` file** with your configuration:
   - Set `DATABASE_URL=sqlite:///instance/dev.db` (default is fine for Docker)
   - Set `API_CORS_ORIGIN=http://localhost:3000,http://web:3000`
   - Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api`
   - Configure other settings as needed (JWT secrets, OAuth, etc.)

3. **Build and start the containers**:
   ```bash
   cd docker
   docker-compose up --build
   ```

4. **Access the application**:
   - Web frontend: http://localhost:3000
   - API: http://localhost:5000
   - API Health check: http://localhost:5000/api/health

## First Time Setup

After starting the containers for the first time, you may need to initialize the database:

1. **Access the API container**:
   ```bash
   docker exec -it student-eval-api bash
   ```

2. **Run database migrations and seeding** (if needed):
   ```bash
   python migrate_database.py
   python seed.py
   ```

## Common Commands

### Start services
```bash
docker-compose up
```

### Start services in detached mode (background)
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### Stop services and remove volumes (cleans database)
```bash
docker-compose down -v
```

### Rebuild containers
```bash
docker-compose up --build
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
```

### Execute commands in containers
```bash
# API container
docker exec -it student-eval-api bash

# Web container
docker exec -it student-eval-web sh
```

## Environment Variables

The system uses environment variables from the `.env` file in the project root. Key variables:

- `DATABASE_URL`: Database connection string (SQLite for development)
- `FLASK_SECRET_KEY`: Secret key for Flask sessions
- `JWT_SECRET`: Secret key for JWT tokens
- `API_CORS_ORIGIN`: Allowed CORS origins (comma-separated)
- `NEXT_PUBLIC_API_BASE_URL`: API base URL for the frontend
- `GOOGLE_OAUTH_CLIENT_ID`: Google OAuth client ID (if using OAuth)

## Troubleshooting

### Port already in use
If ports 3000 or 5000 are already in use, you can change them in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change host port
  - "5001:5000"  # Change host port
```

### Database not persisting
The database is stored in a Docker volume. To reset it:
```bash
docker-compose down -v
docker-compose up --build
```

### API not accessible from web
Check that:
1. The API container is healthy (check logs)
2. CORS origins include `http://localhost:3000`
3. Both services are on the same Docker network

### Container won't start
1. Check logs: `docker-compose logs`
2. Verify `.env` file exists and has correct values
3. Try rebuilding: `docker-compose up --build --force-recreate`

## Development vs Production

This setup is configured for **development**. For production:

1. Update `apps/web/Dockerfile` to use `npm run build` and `npm start`
2. Set `FLASK_ENV=production` and `FLASK_DEBUG=False` in `.env`
3. Use a production database (PostgreSQL) instead of SQLite
4. Configure proper secrets and security settings
5. Use a reverse proxy (nginx) for production deployment

## Volumes

- `api_db_data`: Persists the SQLite database file
- Source code is mounted as volumes for hot-reloading during development

## Network

Services communicate through the `student-eval-network` bridge network. The web service can reach the API using the service name `api` on port 5000.

