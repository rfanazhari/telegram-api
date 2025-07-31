# Use Node.js v20 as the base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Create data directory for SQLite database
RUN mkdir -p data

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]