# Production Dockerfile for smart contract development
FROM ubuntu:latest

# Install dependencies
RUN apt update && apt install -y ca-certificates curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt install -y nodejs

WORKDIR /app

# Copy application files into the container
COPY . . 

# Ensure dependencies are installed
RUN npm install

# Start the application
CMD ["node", "server.js"]
