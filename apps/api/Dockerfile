FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Update package list (curl not needed, using Python for health checks)
RUN apt-get update && rm -rf /var/lib/apt/lists/*

# Configure pip for better reliability
RUN pip config set global.timeout 300 && \
    pip config set global.retries 5

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create instance directory for database
RUN mkdir -p instance

# Make entrypoint script executable
RUN chmod +x docker-entrypoint.sh

EXPOSE 5000

ENTRYPOINT ["./docker-entrypoint.sh"]

