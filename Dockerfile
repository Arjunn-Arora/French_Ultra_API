# Use lightweight Node LTS image
FROM node:lts-alpine

# Create app directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies (clean install)
RUN npm ci

# Copy remaining source code
COPY . .

# Expose port
EXPOSE 3000

# Start app
CMD ["node", "index.js"]