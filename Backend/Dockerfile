FROM node:20-alpine

WORKDIR /app

# Install native build tools required for building packages like bcrypt on Alpine Linux
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies (use --legacy-peer-deps to prevent peer dependency resolution conflicts on CI)
RUN npm install --legacy-peer-deps

# Copy application files
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Start the application
CMD ["node", "src/index.js"]
