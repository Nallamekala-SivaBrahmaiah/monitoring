#!/bin/bash
set -e

DOMAIN="multicloudwithsiva.online"
EMAIL="admin@multicloudwithsiva.online"
RSA_KEY_SIZE=4096
DATA_PATH="./certbot"

if [ -d "$DATA_PATH/conf/live/$DOMAIN" ]; then
  read -p "Existing data found for $DOMAIN. Continue and replace certificate? (y/N) " decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    exit
  fi
fi

echo "### 1. Creating dummy certificate for $DOMAIN ..."
mkdir -p "$DATA_PATH/conf/live/$DOMAIN"
mkdir -p "$DATA_PATH/www"

docker compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1\
    -keyout '/etc/letsencrypt/live/$DOMAIN/privkey.pem' \
    -out '/etc/letsencrypt/live/$DOMAIN/fullchain.pem' \
    -subj '/CN=localhost'" certbot

echo "### 2. Starting Nginx..."
docker compose up --force-recreate -d nginx

echo "### 3. Deleting dummy certificate..."
docker compose run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$DOMAIN && \
  rm -Rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -Rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

echo "### 4. Requesting real Let's Encrypt certificate for $DOMAIN ..."
docker compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    -d $DOMAIN \
    -d www.$DOMAIN \
    --email $EMAIL \
    --rsa-key-size $RSA_KEY_SIZE \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

echo "### 5. Reloading Nginx with production SSL certificate..."
docker compose exec nginx nginx -s reload

echo "=========================================================="
echo "  SSL Certificate successfully installed for https://$DOMAIN !"
echo "=========================================================="
