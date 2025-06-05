#!/bin/bash

# Update system
sudo apt update && sudo apt upgrade -y

# Install
curl -fsSL https://download.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/archive-keyring.gpg] https://download.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/list > /dev/null
sudo apt update
sudo apt install ce cli containerd.io -y

# Install Compose
sudo curl -L "https://github.com/compose/releases/download/$(curl -s https://api.github.com/repos/compose/releases/latest | grep tag_name | cut -d \" -f4)/compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/compose
sudo chmod +x /usr/local/bin/compose

# Post-installation
sudo usermod -aG $USER
newgrp

# Verify installations
docker --version
docker-compose --version

# Test
docker run hello-world

# Start Compose
docker-compose up -d

# Fix certificate issue in security_service
cat <<EOF > ./security-service/Dockerfile
FROM ubuntu:latest

# Ensure certificates are installed before updating packages
RUN apt update && apt install -y ca-certificates

# Install curl after fixing cert issues
RUN apt update && apt install -y curl

CMD ["node", "server.js"]
EOF

# Rebuild security_service
docker-compose build --no-cache security_service
docker-compose up -d