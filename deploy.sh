#!/bin/bash
set -e

DOMAIN="multicloudwithsiva.online"
SERVER_IP="20.235.241.140"
REPO_URL="https://github.com/Nallamekala-SivaBrahmaiah/monitoring.git"

echo "=========================================================="
echo "  Deploying Multi-Cloud Monitoring Platform"
echo "  Domain: $DOMAIN"
echo "  Server IP: $SERVER_IP"
echo "=========================================================="

# 1. Update system & verify Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    sudo apt-get update -y
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable --now docker
    sudo usermod -aG docker $USER
fi

# 2. Build and launch containers
echo "Building and launching Docker containers..."
docker compose down || true
docker compose up -d --build

echo ""
echo "Container Status:"
docker compose ps

echo ""
echo "=========================================================="
echo "  Application successfully deployed!"
echo "  Access via HTTP:"
echo "    http://$DOMAIN"
echo "    http://$SERVER_IP"
echo "=========================================================="
echo ""
echo "To enable Free SSL (HTTPS) with Let's Encrypt, run:"
echo "  docker compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d $DOMAIN -d www.$DOMAIN --email admin@$DOMAIN --agree-tos --no-eff-email"
