FROM node:20-alpine

WORKDIR /app

# Configure npm for better reliability
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 3

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]

