FROM node:20-alpine

WORKDIR /app

# Configure npm for better reliability
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 3

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Copy application files
COPY . .

EXPOSE 3000

# Use dev mode for development, can be changed to "start" for production
CMD ["npm", "run", "dev"]

