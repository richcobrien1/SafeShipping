#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io -y

# Install Docker-Compose
sudo curl -L "https://github.com/docker/compose/releases/download/$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d \" -f4)/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Post-installation
sudo usermod -aG docker $USER
newgrp docker

# Verify installations
docker --version
docker-compose --version

# Test Docker
docker run hello-world

# Docker-Compose Setup
cat <<EOF > docker-compose.yml
version: \"3.8\"
services:
  api_service:
    build: ./api_service
    ports:
      - \"5000:5000\"
    volumes:
      - ./api_service:/app
    networks:
      - app_network

  db_service:
    image: postgres:latest
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: mydb
    ports:
      - \"5432:5432\"
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - app_network

  blockchain_service:
    build: ./blockchain_service
    ports:
      - \"8545:8545\"
    networks:
      - app_network

  iot_processor:
    build: ./iot_processor
    ports:
      - \"8080:8080\"
    networks:
      - app_network

networks:
  app_network:
    driver: bridge

volumes:
  db_data:
EOF

# Start Docker-Compose
docker-compose up -d
