#!/bin/bash

# =================================================================
# Traefik Debugging Script for Richie's Game Collection
# =================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Load environment variables
if [ -f ".env" ]; then
    source .env
    print_success "Loaded .env file"
else
    print_warning ".env file not found, using defaults"
    COMPOSE_PROJECT_NAME=minis
    DOMAIN=minis.richie.ch
    CERT_RESOLVER=myresolver
fi

echo ""
print_status "🔍 Traefik & SSL Certificate Debugging"
echo "=========================================="

# Check if containers are running
print_status "1. Container Status:"
docker-compose ps

echo ""
print_status "2. Container Network Configuration:"
echo "Checking if containers are on traefik_public network..."
docker network ls | grep traefik_public
echo ""
docker network inspect traefik_public | jq -r '.Containers | to_entries[] | select(.value.Name | contains("'${COMPOSE_PROJECT_NAME}'")) | .value.Name + " -> " + .value.IPv4Address'

echo ""
print_status "3. Traefik Service Discovery:"
echo "Checking Traefik labels on containers..."
echo ""
print_status "Container 1 labels:"
docker inspect ${COMPOSE_PROJECT_NAME}-web-1 | jq -r '.[] | .Config.Labels | to_entries[] | select(.key | startswith("traefik")) | .key + "=" + .value'

echo ""
print_status "Container 2 labels:"
docker inspect ${COMPOSE_PROJECT_NAME}-web-2 | jq -r '.[] | .Config.Labels | to_entries[] | select(.key | startswith("traefik")) | .key + "=" + .value'

echo ""
print_status "4. SSL Certificate Check:"
echo "Domain: https://${DOMAIN}"
echo ""

# Check if domain resolves
print_status "DNS Resolution:"
nslookup ${DOMAIN} || echo "DNS lookup failed"

echo ""
print_status "Certificate Information:"
# Check certificate details
timeout 10 openssl s_client -connect ${DOMAIN}:443 -servername ${DOMAIN} 2>/dev/null | openssl x509 -noout -text | grep -A 2 "Issuer:"
echo ""
timeout 10 openssl s_client -connect ${DOMAIN}:443 -servername ${DOMAIN} 2>/dev/null | openssl x509 -noout -text | grep -A 2 "Subject:"

echo ""
print_status "5. Traefik API Check:"
echo "If Traefik dashboard is available, check these URLs:"
echo "  - http://traefik.yourdomain.com:8080/api/http/services"
echo "  - http://traefik.yourdomain.com:8080/api/http/routers"
echo ""

print_status "6. Common SSL Certificate Issues:"
echo ""
print_warning "Potential Issues:"
echo "  1. Cert Resolver Name Mismatch:"
echo "     Your .env: CERT_RESOLVER=${CERT_RESOLVER}"
echo "     Check Traefik config for resolver named '${CERT_RESOLVER}'"
echo ""
echo "  2. Domain Access from ACME:"
echo "     ACME server needs to reach https://${DOMAIN}/.well-known/acme-challenge/"
echo ""
echo "  3. Traefik Entrypoint Configuration:"
echo "     Ensure 'websecure' entrypoint exists and listens on :443"
echo ""
echo "  4. Rate Limiting:"
echo "     Let's Encrypt has rate limits - check if you've hit them"

echo ""
print_status "7. Testing Direct Container Access:"
INTERNAL_PORT_1=${INTERNAL_PORT_1:-11888}
INTERNAL_PORT_2=${INTERNAL_PORT_2:-11889}

echo "Testing container 1 (port ${INTERNAL_PORT_1}):"
curl -s -w "HTTP Status: %{http_code}\n" http://localhost:${INTERNAL_PORT_1}/health || echo "Failed"

echo ""
echo "Testing container 2 (port ${INTERNAL_PORT_2}):"
curl -s -w "HTTP Status: %{http_code}\n" http://localhost:${INTERNAL_PORT_2}/health || echo "Failed"

echo ""
print_status "8. Suggested Next Steps:"
echo ""
print_success "To fix load balancing:"
echo "  - Restart containers: docker-compose up -d"
echo "  - Check Traefik logs: docker logs traefik-container-name"

echo ""
print_success "To debug SSL certificates:"
echo "  - Check Traefik config for resolver '${CERT_RESOLVER}'"
echo "  - Verify domain DNS points to your server"
echo "  - Check Traefik dashboard for certificate status"
echo "  - Review Traefik logs for ACME errors"

echo ""
print_status "🎯 Current Configuration Summary:"
echo "  Domain: ${DOMAIN}"
echo "  Project: ${COMPOSE_PROJECT_NAME}" 
echo "  Cert Resolver: ${CERT_RESOLVER}"
echo "  Container Ports: ${INTERNAL_PORT_1:-11888}, ${INTERNAL_PORT_2:-11889}"