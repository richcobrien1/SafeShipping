# Kubernetes Configuration Guide for SafeShipping

This guide documents the Kubernetes configuration for the SafeShipping blockchain-based supply chain solution, including all necessary manifests for deploying the application in a Kubernetes cluster.

## Project Overview

SafeShipping is a blockchain-based supply chain solution that leverages smart contracts, decentralized oracles, IoT integration, and cross-chain interoperability to provide secure, transparent, and efficient shipping logistics.

## Directory Structure

```
/safeshipping/kubernetes/
├── namespace.yaml                       # Namespace definition
├── blockchain-node-configmap.yaml       # ConfigMap for blockchain node
├── blockchain-node-pvc.yaml             # PersistentVolumeClaim for blockchain data
├── blockchain-node-deployment.yaml      # Deployment for blockchain node
├── blockchain-node-service.yaml         # Service for blockchain node
├── oracle-service-configmap.yaml        # ConfigMap for oracle service
├── oracle-service-deployment.yaml       # Deployment for oracle service
├── oracle-service-service.yaml          # Service for oracle service
├── backend-api-configmap.yaml           # ConfigMap for backend API
├── backend-api-deployment.yaml          # Deployment for backend API
├── backend-api-service.yaml             # Service for backend API
├── backend-secrets.yaml                 # Secrets for backend API
├── frontend-configmap.yaml              # ConfigMap for frontend nginx
├── frontend-deployment.yaml             # Deployment for frontend
├── frontend-service.yaml                # Service for frontend
├── security-service-configmap.yaml      # ConfigMap for security service
├── security-service-deployment.yaml     # Deployment for security service
├── security-service-service.yaml        # Service for security service
├── smart-contracts-deployment.yaml      # Deployment for smart contracts
├── smart-contracts-service.yaml         # Service for smart contracts
└── ingress.yaml                         # Ingress for external access
```

## Kubernetes Components

### Namespace

The `namespace.yaml` file creates a dedicated namespace for all SafeShipping resources:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: safeshipping
  labels:
    name: safeshipping
    app: safeshipping
```

### Blockchain Node

#### ConfigMap (`blockchain-node-configmap.yaml`)

Contains configuration for the Ethereum node and startup script:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: blockchain-node-config
  namespace: safeshipping
data:
  geth-config.toml: |
    [server]
    Datadir = "/data/ethereum"
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
  
  start-node.sh: |
    #!/bin/bash
    # Start script for Ethereum node

    # Set default network if not provided
    NETWORK=${NETWORK:-mainnet}

    # Start geth with appropriate flags based on network
    case "$NETWORK" in
      "mainnet")
        exec geth --config /config/geth-config.toml --datadir /data/ethereum --http --http.addr "0.0.0.0" --http.api "eth,net,web3,txpool" --ws --ws.addr "0.0.0.0" --ws.api "eth,net,web3,txpool"
        ;;
      "testnet")
        exec geth --goerli --config /config/geth-config.toml --datadir /data/ethereum --http --http.addr "0.0.0.0" --http.api "eth,net,web3,txpool" --ws --ws.addr "0.0.0.0" --ws.api "eth,net,web3,txpool"
        ;;
      "private")
        exec geth --datadir /data/ethereum/private --networkid 1337 --http --http.addr "0.0.0.0" --http.api "eth,net,web3,txpool,personal,miner" --ws --ws.addr "0.0.0.0" --ws.api "eth,net,web3,txpool,personal,miner" --mine --miner.threads=1 --allow-insecure-unlock
        ;;
      *)
        echo "Unknown network: $NETWORK"
        echo "Supported networks: mainnet, testnet, private"
        exit 1
        ;;
    esac
```

#### PersistentVolumeClaim (`blockchain-node-pvc.yaml`)

Provides persistent storage for blockchain data:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ethereum-data-pvc
  namespace: safeshipping
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: standard
```

#### Deployment (`blockchain-node-deployment.yaml`)

Deploys the Ethereum node:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blockchain-node
  namespace: safeshipping
spec:
  replicas: 1
  selector:
    matchLabels:
      app: blockchain-node
  strategy:
    type: Recreate  # Ensure only one instance runs at a time due to volume access
  template:
    metadata:
      labels:
        app: blockchain-node
    spec:
      containers:
      - name: blockchain-node
        image: ethereum/client-go:stable
        imagePullPolicy: IfNotPresent
        command: ["/bin/sh"]
        args: ["-c", "chmod +x /config/start-node.sh && /config/start-node.sh"]
        env:
        - name: NETWORK
          value: "mainnet"  # Can be changed to testnet or private
        ports:
        - containerPort: 8545
          name: http-rpc
        - containerPort: 8546
          name: websocket
        - containerPort: 30303
          name: p2p-tcp
        - containerPort: 30303
          protocol: UDP
          name: p2p-udp
        resources:
          requests:
            cpu: "1"
            memory: "2Gi"
          limits:
            cpu: "2"
            memory: "4Gi"
        volumeMounts:
        - name: ethereum-data
          mountPath: /data/ethereum
        - name: config-volume
          mountPath: /config
        readinessProbe:
          httpGet:
            path: /
            port: 8545
          initialDelaySeconds: 30
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /
            port: 8545
          initialDelaySeconds: 60
          periodSeconds: 20
      volumes:
      - name: ethereum-data
        persistentVolumeClaim:
          claimName: ethereum-data-pvc
      - name: config-volume
        configMap:
          name: blockchain-node-config
          defaultMode: 0755
```

#### Service (`blockchain-node-service.yaml`)

Exposes the Ethereum node to other services:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: blockchain-node
  namespace: safeshipping
spec:
  selector:
    app: blockchain-node
  ports:
  - name: http-rpc
    port: 8545
    targetPort: 8545
  - name: websocket
    port: 8546
    targetPort: 8546
  - name: p2p-tcp
    port: 30303
    targetPort: 30303
  - name: p2p-udp
    port: 30303
    targetPort: 30303
    protocol: UDP
  type: ClusterIP
```

### Oracle Service

#### ConfigMap (`oracle-service-configmap.yaml`)

Contains configuration for the oracle service:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: oracle-service-config
  namespace: safeshipping
data:
  config.json: |
    {
      "ethereum": {
        "nodeUrl": "http://blockchain-node:8545",
        "chainId": 1,
        "confirmations": 3
      },
      "oracle": {
        "updateInterval": 60,
        "gasLimit": 500000,
        "retryAttempts": 3,
        "retryDelay": 15
      },
      "logging": {
        "level": "info",
        "format": "json"
      }
    }
```

#### Deployment (`oracle-service-deployment.yaml`)

Deploys the oracle service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oracle-service
  namespace: safeshipping
spec:
  replicas: 2
  selector:
    matchLabels:
      app: oracle-service
  template:
    metadata:
      labels:
        app: oracle-service
    spec:
      containers:
      - name: oracle-service
        image: safeshipping/oracle-service:latest
        imagePullPolicy: Always
        env:
        - name: NODE_ENV
          value: "production"
        - name: ETHEREUM_URL
          value: "http://blockchain-node:8545"
        ports:
        - containerPort: 3000
          name: http
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1"
            memory: "1Gi"
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 20
          periodSeconds: 15
      volumes:
      - name: config-volume
        configMap:
          name: oracle-service-config
```

#### Service (`oracle-service-service.yaml`)

Exposes the oracle service to other services:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: oracle-service
  namespace: safeshipping
spec:
  selector:
    app: oracle-service
  ports:
  - name: http
    port: 3000
    targetPort: 3000
  type: ClusterIP
```

### Backend API

#### ConfigMap (`backend-api-configmap.yaml`)

Contains configuration for the backend API:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-api-config
  namespace: safeshipping
data:
  config.json: |
    {
      "server": {
        "port": 4000,
        "cors": {
          "origin": "*",
          "methods": ["GET", "POST", "PUT", "DELETE"]
        }
      },
      "blockchain": {
        "nodeUrl": "http://blockchain-node:8545",
        "contracts": {
          "billOfLading": "0x1234567890abcdef1234567890abcdef12345678",
          "shipmentTracking": "0xabcdef1234567890abcdef1234567890abcdef12"
        }
      },
      "oracle": {
        "serviceUrl": "http://oracle-service:3000"
      },
      "security": {
        "jwtSecret": "${JWT_SECRET}",
        "tokenExpiration": "24h"
      },
      "logging": {
        "level": "info",
        "format": "json"
      }
    }
```

#### Secrets (`backend-secrets.yaml`)

Contains sensitive information for the backend API:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secrets
  namespace: safeshipping
type: Opaque
data:
  jwt-secret: c2FmZXNoaXBwaW5nLXNlY3JldC1rZXk=  # Base64 encoded "safeshipping-secret-key"
```

#### Deployment (`backend-api-deployment.yaml`)

Deploys the backend API:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: safeshipping
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      containers:
      - name: backend-api
        image: safeshipping/backend-api:latest
        imagePullPolicy: Always
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "4000"
        - name: BLOCKCHAIN_NODE_URL
          value: "http://blockchain-node:8545"
        - name: ORACLE_SERVICE_URL
          value: "http://oracle-service:3000"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: backend-secrets
              key: jwt-secret
        ports:
        - containerPort: 4000
          name: http
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1"
            memory: "1Gi"
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
        readinessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 20
          periodSeconds: 15
      volumes:
      - name: config-volume
        configMap:
          name: backend-api-config
```

#### Service (`backend-api-service.yaml`)

Exposes the backend API to other services:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-api
  namespace: safeshipping
spec:
  selector:
    app: backend-api
  ports:
  - name: http
    port: 4000
    targetPort: 4000
  type: ClusterIP
```

### Frontend

#### ConfigMap (`frontend-configmap.yaml`)

Contains nginx configuration for the frontend:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-config
  namespace: safeshipping
data:
  nginx.conf: |
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

#### Deployment (`frontend-deployment.yaml`)

Deploys the frontend:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: safeshipping
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: safeshipping/frontend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 80
          name: http
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        volumeMounts:
        - name: nginx-config
          mountPath: /etc/nginx/conf.d
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 20
          periodSeconds: 15
      volumes:
      - name: nginx-config
        configMap:
          name: frontend-config
```

#### Service (`frontend-service.yaml`)

Exposes the frontend to other services:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: safeshipping
spec:
  selector:
    app: frontend
  ports:
  - name: http
    port: 80
    targetPort: 80
  type: ClusterIP
```

### Security Service

#### ConfigMap (`security-service-configmap.yaml`)

Contains configuration for the security service:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: security-service-config
  namespace: safeshipping
data:
  config.json: |
    {
      "server": {
        "port": 5000,
        "cors": {
          "origin": "*",
          "methods": ["GET", "POST", "PUT", "DELETE"]
        }
      },
      "security": {
        "encryption": {
          "algorithm": "aes-256-gcm",
          "keyRotationDays": 30
        },
        "audit": {
          "enabled": true,
          "storageRetentionDays": 90
        },
        "gdpr": {
          "enabled": true,
          "dataMinimization": true
        }
      },
      "backend": {
        "apiUrl": "http://backend-api:4000"
      },
      "logging": {
        "level": "info",
        "format": "json"
      }
    }
```

#### Deployment (`security-service-deployment.yaml`)

Deploys the security service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: security-service
  namespace: safeshipping
spec:
  replicas: 2
  selector:
    matchLabels:
      app: security-service
  template:
    metadata:
      labels:
        app: security-service
    spec:
      containers:
      - name: security-service
        image: safeshipping/security-service:latest
        imagePullPolicy: Always
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "5000"
        - name: BACKEND_API_URL
          value: "http://backend-api:4000"
        ports:
        - containerPort: 5000
          name: http
        resources:
          requests:
            cpu: "300m"
            memory: "384Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        volumeMounts:
        - name: config-volume
          mountPath: /app/config
        readinessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 20
          periodSeconds: 15
      volumes:
      - name: config-volume
        configMap:
          name: security-service-config
```

#### Service (`security-service-service.yaml`)

Exposes the security service to other services:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: security-service
  namespace: safeshipping
spec:
  selector:
    app: security-service
  ports:
  - name: http
    port: 5000
    targetPort: 5000
  type: ClusterIP
```

### Smart Contracts

#### Deployment (`smart-contracts-deployment.yaml`)

Deploys the smart contracts service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: smart-contracts
  namespace: safeshipping
spec:
  replicas: 1
  selector:
    matchLabels:
      app: smart-contracts
  template:
    metadata:
      labels:
        app: smart-contracts
    spec:
      containers:
      - name: smart-contracts
        image: safeshipping/smart-contracts:latest
        imagePullPolicy: Always
        env:
        - name: NODE_ENV
          value: "production"
        - name: ETHEREUM_NODE_URL
          value: "http://blockchain-node:8545"
        ports:
        - containerPort: 8545
          name: http
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1"
            memory: "1Gi"
        volumeMounts:
        - name: contracts-volume
          mountPath: /app/contracts
        readinessProbe:
          httpGet:
            path: /health
            port: 8545
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 8545
          initialDelaySeconds: 20
          periodSeconds: 15
      volumes:
      - name: contracts-volume
        emptyDir: {}
```

#### Service (`smart-contracts-service.yaml`)

Exposes the smart contracts service to other services:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: smart-contracts
  namespace: safeshipping
spec:
  selector:
    app: smart-contracts
  ports:
  - name: http
    port: 8545
    targetPort: 8545
  type: ClusterIP
```

### Ingress

The `ingress.yaml` file provides external access to the application:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: safeshipping-ingress
  namespace: safeshipping
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/use-regex: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - safeshipping.example.com
    secretName: safeshipping-tls
  rules:
  - host: safeshipping.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-api
            port:
              number: 4000
```

## Deployment Instructions

### Prerequisites

1. A Kubernetes cluster (e.g., EKS, GKE, AKS, or Minikube for local development)
2. `kubectl` configured to communicate with your cluster
3. Docker images for all services pushed to a container registry
4. Storage class available for persistent volumes

### Deployment Steps

1. Create the namespace:
   ```bash
   kubectl apply -f kubernetes/namespace.yaml
   ```

2. Create ConfigMaps and Secrets:
   ```bash
   kubectl apply -f kubernetes/blockchain-node-configmap.yaml
   kubectl apply -f kubernetes/oracle-service-configmap.yaml
   kubectl apply -f kubernetes/backend-api-configmap.yaml
   kubectl apply -f kubernetes/frontend-configmap.yaml
   kubectl apply -f kubernetes/security-service-configmap.yaml
   kubectl apply -f kubernetes/backend-secrets.yaml
   ```

3. Create PersistentVolumeClaim:
   ```bash
   kubectl apply -f kubernetes/blockchain-node-pvc.yaml
   ```

4. Deploy the blockchain node:
   ```bash
   kubectl apply -f kubernetes/blockchain-node-deployment.yaml
   kubectl apply -f kubernetes/blockchain-node-service.yaml
   ```

5. Deploy the oracle service:
   ```bash
   kubectl apply -f kubernetes/oracle-service-deployment.yaml
   kubectl apply -f kubernetes/oracle-service-service.yaml
   ```

6. Deploy the smart contracts service:
   ```bash
   kubectl apply -f kubernetes/smart-contracts-deployment.yaml
   kubectl apply -f kubernetes/smart-contracts-service.yaml
   ```

7. Deploy the backend API:
   ```bash
   kubectl apply -f kubernetes/backend-api-deployment.yaml
   kubectl apply -f kubernetes/backend-api-service.yaml
   ```

8. Deploy the security service:
   ```bash
   kubectl apply -f kubernetes/security-service-deployment.yaml
   kubectl apply -f kubernetes/security-service-service.yaml
   ```

9. Deploy the frontend:
   ```bash
   kubectl apply -f kubernetes/frontend-deployment.yaml
   kubectl apply -f kubernetes/frontend-service.yaml
   ```

10. Create the Ingress (if using an Ingress controller):
    ```bash
    kubectl apply -f kubernetes/ingress.yaml
    ```

### Verification

Check the status of all deployments:
```bash
kubectl get all -n safeshipping
```

Check the logs of a specific pod:
```bash
kubectl logs -n safeshipping <pod-name>
```

## Scaling

### Horizontal Pod Autoscaler

You can add Horizontal Pod Autoscalers (HPA) for services that need to scale based on CPU or memory usage:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-api-hpa
  namespace: safeshipping
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Monitoring and Logging

Consider adding:

1. Prometheus for metrics collection
2. Grafana for visualization
3. ELK stack or Loki for log aggregation

## Security Considerations

1. Use network policies to restrict communication between services
2. Implement proper RBAC for service accounts
3. Regularly rotate secrets
4. Use security contexts to run containers with minimal privileges

## Backup and Disaster Recovery

1. Regularly backup the blockchain data PVC
2. Consider using Velero for cluster-wide backups
3. Implement a disaster recovery plan with regular testing

## Comparison with Docker Compose

While Docker Compose is excellent for local development and simple deployments, Kubernetes offers:

1. **Advanced Scaling**: Automatic horizontal scaling based on metrics
2. **Self-healing**: Automatic restart of failed containers
3. **Rolling Updates**: Zero-downtime deployments
4. **Service Discovery**: Built-in DNS for service-to-service communication
5. **Load Balancing**: Automatic load balancing for services
6. **Resource Management**: CPU and memory limits/requests
7. **Secret Management**: Secure storage and distribution of secrets
8. **Ingress Management**: Advanced routing and TLS termination

This Kubernetes configuration provides a production-ready deployment for the SafeShipping blockchain-based supply chain solution, with all necessary components containerized, properly integrated, and configured for scalability and resilience.
