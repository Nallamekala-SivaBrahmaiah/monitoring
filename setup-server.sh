#!/bin/bash
set -e

DOMAIN="multicloudwithsiva.online"
EMAIL="admin@multicloudwithsiva.online"

echo "=========================================================="
echo "  Setting up NVM, Node.js, NPM, PM2, Nginx, and SSL"
echo "  Domain: $DOMAIN"
echo "=========================================================="

# 1. Update Ubuntu packages
sudo apt update -y
sudo apt upgrade -y
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx

# 2. Install NVM and Node.js 20 (LTS)
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

nvm install 20
nvm use 20
nvm alias default 20

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 3. Install PM2 globally
npm install -g pm2

# 4. Install dependencies and build project
echo "Installing project dependencies..."
npm ci
(cd server && npm ci)

echo "Building Next.js frontend..."
npm run build

# 5. Start apps with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -n 1 | bash || true

# 6. Configure Nginx
cat << 'EOF' | sudo tee /etc/nginx/sites-available/monitoring > /dev/null
upstream frontend_upstream {
    server 127.0.0.1:3000;
}

upstream backend_upstream {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    listen [::]:80;
    server_name multicloudwithsiva.online www.multicloudwithsiva.online 20.235.241.140;

    location /api/ {
        proxy_pass http://backend_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /metrics {
        proxy_pass http://backend_upstream/metrics;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /_next/static {
        proxy_pass http://frontend_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://frontend_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/monitoring /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# 7. Obtain SSL Certificates with Certbot
echo "Obtaining SSL Certificates..."
sudo certbot --nginx -d multicloudwithsiva.online -d www.multicloudwithsiva.online --email $EMAIL --agree-tos --no-eff-email --redirect || true

echo "=========================================================="
echo "  Setup Complete! Visit https://$DOMAIN"
echo "=========================================================="
