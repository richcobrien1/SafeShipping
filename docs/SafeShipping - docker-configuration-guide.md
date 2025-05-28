# Docker Configuration Guide for SafeShipping

This guide documents the Docker configuration for the SafeShipping blockchain-based supply chain solution, including Dockerfiles for each service and Docker Compose configurations for development and production environments.

## Project Overview

SafeShipping is a blockchain-based supply chain solution that leverages smart contracts, decentralized oracles, IoT integration, and cross-chain interoperability to provide secure, transparent, and efficient shipping logistics.

## Directory Structure

```
/safeshipping/
├── docker/
│   ├── smart-contracts/
│   │   ├── Dockerfile.dev     # Development Dockerfile for smart contract development
│   │   └── Dockerfile.prod    # Production Dockerfile for smart contract deployment
│   ├── blockchain-node/
│   │   ├── Dockerfile         # Dockerfile for Ethereum node
│   │   ├── config/            # Configuration files for blockchain node
│   │   │   └── geth-config.toml
│   │   └── scripts/           # Scripts for blockchain node
│   │       └── start-node.sh
│   ├── oracle-service/
│   │   ├── Dockerfile.dev     # Development Dockerfile for oracle service
│   │   └── Dockerfile.prod    # Production Dockerfile for oracle service
│   ├── backend-api/
│   │   ├── Dockerfile.dev     # Development Dockerfile for backend API
│   │   └── Dockerfile.prod    # Production Dockerfile for backend API
│   ├── frontend/
│   │   ├── Dockerfile.dev     # Development Dockerfile for frontend
│   │   ├── Dockerfile.prod    # Production Dockerfile for frontend
│   │   └── nginx.conf         # Nginx configuration for production frontend
│   └── security-service/
│       ├── Dockerfile.dev     # Development Dockerfile for security service
│       └── Dockerfile.prod    # Production Dockerfile for security service
├── docker-compose.yml         # Development Docker Compose configuration
└── docker-compose.prod.yml    # Production Docker Compose configuration
```

## Service Configurations

### Smart Contract Development Environment

#### Development (Dockerfile.dev)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies for development
RUN apk add --no-cache python3 make g++ git bash curl

# Install Solidity compiler
RUN apk add --no-cache --virtual .build-deps \
    boost-dev \
    cmake \
    g++ \
    gcc \
    git \
    make \
    && git clone --depth 1 --branch v0.8.20 https://github.com/ethereum/solidity.git \
    && cd solidity \
    && cmake -DCMAKE_BUILD_TYPE=Release \
    && make solc \
    && cp solc/solc /usr/local/bin/ \
    && cd .. \
    && rm -rf solidity \
    && apk del .build-deps

# Install Truffle and Hardhat globally
RUN npm install -g truffle hardhat @openzeppelin/contracts-ethereum-package ganache-cli

# Install security analysis tools
RUN npm install -g slither-analyzer solhint

# Create directories for project
RUN mkdir -p /app/contracts /app/test /app/scripts

# Copy package files
COPY package*.json ./
RUN npm install

# Set environment variables
ENV NODE_ENV=development

# Expose ports for Ganache and Hardhat Network
EXPOSE 8545
EXPOSE 9545

# Start development environment
CMD ["npm", "run", "dev"]
```

#### Production (Dockerfile.prod)

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Install dependencies for building
RUN apk add --no-cache python3 make g++ git bash curl

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY contracts ./contracts
COPY scripts ./scripts
COPY migrations ./migrations
COPY truffle-config.js ./
COPY hardhat.config.js ./

# Build contracts if needed
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install minimal runtime dependencies
RUN apk add --no-cache bash curl

# Copy built files from builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/contracts ./contracts
COPY --from=builder /app/scripts ./scripts

# Set environment variables
ENV NODE_ENV=production

# Expose port if needed
EXPOSE 8545

# Start the service
CMD ["npm", "run", "start"]
```

### Blockchain Node

#### Dockerfile

```dockerfile
FROM ethereum/client-go:stable

# Set working directory
WORKDIR /root

# Expose ports for P2P, RPC, and WebSocket
EXPOSE 30303 30303/udp
EXPOSE 8545
EXPOSE 8546

# Create data directory
RUN mkdir -p /root/.ethereum/keystore

# Copy configuration files if needed
COPY ./config/geth-config.toml /root/geth-config.toml

# Set environment variables
ENV NETWORK=mainnet

# Start script
COPY ./scripts/start-node.sh /root/start-node.sh
RUN chmod +x /root/start-node.sh

# Default command
ENTRYPOINT ["/root/start-node.sh"]
```

#### Start Script (start-node.sh)

```bash
#!/bin/bash
# Start script for Ethereum node

# Set default network if not provided
NETWORK=${NETWORK:-mainnet}

# Start geth with appropriate flags based on network
case "$NETWORK" in
  "mainnet")
    exec geth --config /root/geth-config.toml --http --http.addr "0.0.0.0" --http.api "eth,net,web3,txpool" --ws --ws.addr "0.0.0.0" --ws.api "eth,net,web3,txpool"
    ;;
  "testnet")
    exec geth --goerli --config /root/geth-config.toml --http --http.addr "0.0.0.0" --http.api "eth,net,web3,txpool" --ws --ws.addr "0.0.0.0" --ws.api "eth,net,web3,txpool"
    ;;
  "private")
    exec geth --datadir /root/.ethereum/private --networkid 1337 --http --http.addr "0.0.0.0" --http.api "eth,net,web3,txpool,personal,miner" --ws --ws.addr "0.0.0.0" --ws.api "eth,net,web3,txpool,personal,miner" --mine --miner.threads=1 --allow-insecure-unlock
    ;;
  *)
    echo "Unknown network: $NETWORK"
    echo "Supported networks: mainnet, testnet, private"
    exit 1
    ;;
esac
```

#### Configuration (geth-config.toml)

```toml
[server]
Datadir = "/root/.ethereum"
HTTPHost = "0.0.0.0"
HTTPPort = 8545
HTTPVirtualHosts = ["*"]
HTTPModules = ["eth", "net", "web3", "txpool"]
WSHost = "0.0.0.0"
WSPort = 8546
WSModules = ["eth", "net", "web3", "txpool"]

[p2p]
MaxPeers = 50
NoDiscovery = false

[eth]
SyncMode = "snap"
NoPruning = false
DatabaseCache = 512

[metrics]
Enabled = true
HTTP = "0.0.0.0"
Port = 6060
```

### Oracle Service

#### Development (Dockerfile.dev)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache python3 make g++ git bash curl

# Install Chainlink node dependencies
RUN npm install -g typescript ts-node

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY src ./src
COPY config ./config

# Set environment variables
ENV NODE_ENV=development
ENV CHAINLINK_URL=http://chainlink:6688
ENV ETHEREUM_URL=http://blockchain-node:8545

# Expose port for the oracle service
EXPOSE 3000

# Start the oracle service in development mode
CMD ["npm", "run", "dev"]
```

#### Production (Dockerfile.prod)

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Install dependencies for building
RUN apk add --no-cache python3 make g++ git bash curl

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src ./src
COPY config ./config
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install minimal runtime dependencies
RUN apk add --no-cache bash curl

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/config ./config

# Set environment variables
ENV NODE_ENV=production
ENV CHAINLINK_URL=http://chainlink:6688
ENV ETHEREUM_URL=http://blockchain-node:8545

# Expose port for the oracle service
EXPOSE 3000

# Start the oracle service
CMD ["node", "dist/index.js"]
```

### Backend API

#### Development (Dockerfile.dev)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache python3 make g++ git bash curl

# Copy package files
COPY backend/package*.json ./
RUN npm install

# Copy source code
COPY backend/src ./src
COPY backend/config ./config

# Set environment variables
ENV NODE_ENV=development
ENV PORT=4000
ENV BLOCKCHAIN_NODE_URL=http://blockchain-node:8545
ENV ORACLE_SERVICE_URL=http://oracle-service:3000

# Expose port for the API
EXPOSE 4000

# Start the API service in development mode with hot reloading
RUN npm install -g nodemon
CMD ["nodemon", "src/index.js"]
```

#### Production (Dockerfile.prod)

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Install dependencies for building
RUN apk add --no-cache python3 make g++ git bash curl

# Copy package files
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy source code
COPY backend/src ./src
COPY backend/config ./config

# Build the application if using TypeScript
RUN if [ -f tsconfig.json ]; then npm run build; fi

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install minimal runtime dependencies
RUN apk add --no-cache bash curl

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/config ./config
# If not using TypeScript, copy the src directory
COPY --from=builder /app/src ./src

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4000
ENV BLOCKCHAIN_NODE_URL=http://blockchain-node:8545
ENV ORACLE_SERVICE_URL=http://oracle-service:3000

# Expose port for the API
EXPOSE 4000

# Start the API service
CMD ["node", "dist/index.js"]
```

### Frontend

#### Development (Dockerfile.dev)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache python3 make g++ git bash curl

# Copy package files
COPY frontend/package*.json ./
RUN npm install

# Copy source code
COPY frontend/src ./src
COPY frontend/public ./public

# Set environment variables
ENV NODE_ENV=development
ENV REACT_APP_API_URL=http://localhost:4000
ENV REACT_APP_BLOCKCHAIN_EXPLORER_URL=https://etherscan.io

# Expose port for the frontend development server
EXPOSE 3000

# Start the frontend development server with hot reloading
CMD ["npm", "start"]
```

#### Production (Dockerfile.prod)

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Install dependencies for building
RUN apk add --no-cache python3 make g++ git bash curl

# Copy package files
COPY frontend/package*.json ./
RUN npm ci

# Copy source code
COPY frontend/src ./src
COPY frontend/public ./public

# Set environment variables for build
ENV NODE_ENV=production
ENV REACT_APP_API_URL=/api
ENV REACT_APP_BLOCKCHAIN_EXPLORER_URL=https://etherscan.io

# Build the frontend application
RUN npm run build

# Production stage using nginx to serve static files
FROM nginx:alpine

# Copy nginx configuration
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

#### Nginx Configuration (nginx.conf)

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Handle frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api/ {
        proxy_pass http://backend-api:4000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

### Security Service

#### Development (Dockerfile.dev)

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache python3 make g++ git bash curl openssl

# Copy package files
COPY security/package*.json ./
RUN npm install

# Copy source code
COPY security/src ./src
COPY security/config ./config

# Set environment variables
ENV NODE_ENV=development
ENV PORT=5000
ENV BACKEND_API_URL=http://backend-api:4000

# Expose port for the security service
EXPOSE 5000

# Start the security service in development mode with hot reloading
RUN npm install -g nodemon
CMD ["nodemon", "src/index.js"]
```

#### Production (Dockerfile.prod)

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Install dependencies for building
RUN apk add --no-cache python3 make g++ git bash curl openssl

# Copy package files
COPY security/package*.json ./
RUN npm ci --only=production

# Copy source code
COPY security/src ./src
COPY security/config ./config

# Build the application if using TypeScript
RUN if [ -f tsconfig.json ]; then npm run build; fi

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install minimal runtime dependencies
RUN apk add --no-cache bash curl openssl

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/config ./config
# If not using TypeScript, copy the src directory
COPY --from=builder /app/src ./src

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV BACKEND_API_URL=http://backend-api:4000

# Expose port for the security service
EXPOSE 5000

# Start the security service
CMD ["node", "dist/index.js"]
```

## Docker Compose Configurations

### Development (docker-compose.yml)

```yaml
version: '3.8'

services:
  # Smart Contract Development Environment
  smart-contracts:
    build:
      context: .
      dockerfile: docker/smart-contracts/Dockerfile.dev
    volumes:
      - ./contracts:/app/contracts
      - ./test:/app/test
      - ./scripts:/app/scripts
      - ./migrations:/app/migrations
    ports:
      - "8545:8545"  # Ganache
      - "9545:9545"  # Hardhat Network
    networks:
      - safeshipping-network

  # Blockchain Node
  blockchain-node:
    build:
      context: ./docker/blockchain-node
      dockerfile: Dockerfile
    volumes:
      - ethereum-data:/root/.ethereum
    ports:
      - "30303:30303"
      - "30303:30303/udp"
      - "8546:8546"  # WebSocket
    environment:
      - NETWORK=private
    networks:
      - safeshipping-network

  # Oracle Service
  oracle-service:
    build:
      context: .
      dockerfile: docker/oracle-service/Dockerfile.dev
    volumes:
      - ./oracle-service/src:/app/src
      - ./oracle-service/config:/app/config
    ports:
      - "3000:3000"
    depends_on:
      - blockchain-node
    environment:
      - ETHEREUM_URL=http://blockchain-node:8545
    networks:
      - safeshipping-network

  # Backend API
  backend-api:
    build:
      context: .
      dockerfile: docker/backend-api/Dockerfile.dev
    volumes:
      - ./backend/src:/app/src
      - ./backend/config:/app/config
    ports:
      - "4000:4000"
    depends_on:
      - blockchain-node
      - oracle-service
    environment:
      - BLOCKCHAIN_NODE_URL=http://blockchain-node:8545
      - ORACLE_SERVICE_URL=http://oracle-service:3000
    networks:
      - safeshipping-network

  # Frontend
  frontend:
    build:
      context: .
      dockerfile: docker/frontend/Dockerfile.dev
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/public:/app/public
    ports:
      - "3001:3000"  # Map to 3001 to avoid conflict with oracle-service
    depends_on:
      - backend-api
    environment:
      - REACT_APP_API_URL=http://localhost:4000
    networks:
      - safeshipping-network

  # Security Service
  security-service:
    build:
      context: .
      dockerfile: docker/security-service/Dockerfile.dev
    volumes:
      - ./security/src:/app/src
      - ./security/config:/app/config
    ports:
      - "5000:5000"
    depends_on:
      - backend-api
    environment:
      - BACKEND_API_URL=http://backend-api:4000
    networks:
      - safeshipping-network

networks:
  safeshipping-network:
    driver: bridge

volumes:
  ethereum-data:
```

### Production (docker-compose.prod.yml)

```yaml
version: '3.8'

services:
  # Smart Contract Development Environment
  smart-contracts:
    build:
      context: .
      dockerfile: docker/smart-contracts/Dockerfile.prod
    volumes:
      - ./contracts:/app/contracts
      - ./scripts:/app/scripts
    networks:
      - safeshipping-network

  # Blockchain Node
  blockchain-node:
    build:
      context: ./docker/blockchain-node
      dockerfile: Dockerfile
    volumes:
      - ethereum-data:/root/.ethereum
    ports:
      - "30303:30303"
      - "30303:30303/udp"
    environment:
      - NETWORK=mainnet
    restart: always
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
    networks:
      - safeshipping-network

  # Oracle Service
  oracle-service:
    build:
      context: .
      dockerfile: docker/oracle-service/Dockerfile.prod
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
    depends_on:
      - blockchain-node
    environment:
      - ETHEREUM_URL=http://blockchain-node:8545
    networks:
      - safeshipping-network

  # Backend API
  backend-api:
    build:
      context: .
      dockerfile: docker/backend-api/Dockerfile.prod
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
    depends_on:
      - blockchain-node
      - oracle-service
    environment:
      - BLOCKCHAIN_NODE_URL=http://blockchain-node:8545
      - ORACLE_SERVICE_URL=http://oracle-service:3000
    networks:
      - safeshipping-network

  # Frontend
  frontend:
    build:
      context: .
      dockerfile: docker/frontend/Dockerfile.prod
    ports:
      - "80:80"
    restart: always
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    depends_on:
      - backend-api
    networks:
      - safeshipping-network

  # Security Service
  security-service:
    build:
      context: .
      dockerfile: docker/security-service/Dockerfile.prod
    restart: always
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    depends_on:
      - backend-api
    environment:
      - BACKEND_API_URL=http://backend-api:4000
    networks:
      - safeshipping-network

networks:
  safeshipping-network:
    driver: bridge

volumes:
  ethereum-data:
```

## Usage Instructions

### Development Environment

1. Create the project directory structure as outlined above
2. Copy all Dockerfiles and configuration files to their respective locations
3. Create a `.env` file with your environment variables (if needed)
4. Start the development environment:
   ```bash
   docker-compose up
   ```
5. Access the services:
   - Smart Contract Development: http://localhost:8545 (Ganache) or http://localhost:9545 (Hardhat)
   - Oracle Service: http://localhost:3000
   - Backend API: http://localhost:4000
   - Frontend: http://localhost:3001
   - Security Service: http://localhost:5000

### Production Environment

1. Ensure your environment variables are production-ready
2. Start the production environment:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```
3. Access the application:
   - Frontend: http://localhost (port 80)
   - All other services are accessible only within the Docker network

## Key Features of This Docker Configuration

1. **Multi-Service Architecture**: Separate containers for each component of the SafeShipping platform
2. **Development and Production Environments**: Distinct configurations for development (with hot reloading) and production (optimized)
3. **Multi-Stage Builds**: Optimized production images with minimal dependencies
4. **Volume Mounting**: Persistent storage for blockchain data and development hot reloading
5. **Network Isolation**: All services communicate over a dedicated Docker network
6. **Resource Limits**: Production containers have CPU and memory limits for better resource management
7. **Nginx Reverse Proxy**: Frontend container serves as a reverse proxy to backend services in production

## Blockchain-Specific Considerations

1. **Ethereum Node Configuration**: Configurable for mainnet, testnet, or private network
2. **Smart Contract Development**: Complete environment with Truffle, Hardhat, and security tools
3. **Oracle Integration**: Dedicated service for connecting blockchain with real-world data
4. **Security Service**: Specialized container for handling encryption, compliance, and audit logging

## Notes and Considerations

1. **Data Persistence**: Blockchain data is stored in a Docker volume for persistence
2. **Security**: Production containers run with minimal dependencies to reduce attack surface
3. **Scalability**: Services can be scaled independently based on load
4. **Monitoring**: Consider adding Prometheus/Grafana containers for monitoring in production
5. **Backup**: Implement regular backups of the ethereum-data volume

This Docker configuration provides a complete development and production environment for the SafeShipping blockchain-based supply chain solution, with all necessary components containerized and properly integrated.
