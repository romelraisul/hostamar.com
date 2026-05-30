#!/bin/bash
# SSL Setup for hostamar.com using Let's Encrypt
# Run this on your production server

set -e

DOMAIN="hostamar.com"
EMAIL="admin@hostamar.com"
NGINX_SSL_DIR="/etc/nginx/ssl"

echo "=== Setting up SSL for $DOMAIN ==="

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt-get update && apt-get install -y certbot
fi

# Create SSL directory
mkdir -p $NGINX_SSL_DIR
mkdir -p /var/www/certbot

# Stop nginx temporarily
nginx -s stop 2>/dev/null || true

# Get SSL certificate
certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    -d $DOMAIN \
    -d www.$DOMAIN

# Copy certificates for Docker
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $NGINX_SSL_DIR/
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $NGINX_SSL_DIR/

# Set permissions
chmod 644 $NGINX_SSL_DIR/fullchain.pem
chmod 600 $NGINX_SSL_DIR/privkey.pem

# Setup auto-renewal cron job
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $NGINX_SSL_DIR/ && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $NGINX_SSL_DIR/ && docker compose -f /app/docker-compose.yml restart nginx") | crontab -

echo "=== SSL setup complete ==="
echo "Certificates will auto-renew daily"
echo "Start the app with: docker compose up -d"
