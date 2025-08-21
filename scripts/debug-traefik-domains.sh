#!/bin/bash

# Traefik Domain Debugging Script
# Helps debug why domain aliases are not being picked up by Traefik
# Usage: ./scripts/debug-traefik-domains.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1" >&2
}

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [[ -f "$PROJECT_DIR/.env" ]]; then
    source "$PROJECT_DIR/.env"
elif [[ -f "$PROJECT_DIR/env.example" ]]; then
    echo -e "${YELLOW}Warning: Using env.example for debugging${NC}"
    source "$PROJECT_DIR/env.example"
else
    error "No .env or env.example file found"
    exit 1
fi

# Check if Docker is running
check_docker() {
    if ! docker ps > /dev/null 2>&1; then
        error "Docker is not running or not accessible"
        exit 1
    fi
    success "Docker is running"
}

# Check container status
check_containers() {
    echo -e "\n${BLUE}=== Container Status ===${NC}"
    
    local containers=("${COMPOSE_PROJECT_NAME:-minis}-web-1" "${COMPOSE_PROJECT_NAME:-minis}-web-2")
    
    for container in "${containers[@]}"; do
        if docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -q "$container"; then
            success "Container $container is running"
            docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "$container"
        else
            error "Container $container is not running"
        fi
    done
}

# Check Traefik labels
check_traefik_labels() {
    echo -e "\n${BLUE}=== Traefik Labels ===${NC}"
    
    local containers=("${COMPOSE_PROJECT_NAME:-minis}-web-1" "${COMPOSE_PROJECT_NAME:-minis}-web-2")
    
    for container in "${containers[@]}"; do
        if docker ps | grep -q "$container"; then
            echo -e "\n${YELLOW}Labels for $container:${NC}"
            docker inspect "$container" --format='{{range $k, $v := .Config.Labels}}{{$k}}={{$v}}{{"\n"}}{{end}}' | grep traefik || echo "  No Traefik labels found"
        fi
    done
}

# Check Traefik network
check_traefik_network() {
    echo -e "\n${BLUE}=== Traefik Network ===${NC}"
    
    local network="${TRAEFIK_NETWORK:-traefik_public}"
    
    if docker network ls | grep -q "$network"; then
        success "Network $network exists"
        
        echo -e "\n${YELLOW}Containers in $network:${NC}"
        docker network inspect "$network" --format='{{range .Containers}}{{.Name}} ({{.IPv4Address}}){{"\n"}}{{end}}' || echo "  No containers found"
    else
        error "Network $network does not exist"
        echo -e "\n${YELLOW}Available networks:${NC}"
        docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}"
    fi
}

# Check Traefik service
check_traefik_service() {
    echo -e "\n${BLUE}=== Traefik Service Status ===${NC}"
    
    # Check if Traefik container is running
    local traefik_container
    traefik_container=$(docker ps --format "{{.Names}}" | grep -i traefik | head -1)
    
    if [[ -n "$traefik_container" ]]; then
        success "Traefik container found: $traefik_container"
        
        # Check Traefik version
        echo -e "\n${YELLOW}Traefik version:${NC}"
        docker exec "$traefik_container" traefik version 2>/dev/null || echo "  Could not get version"
        
        # Check Traefik configuration
        echo -e "\n${YELLOW}Traefik configuration:${NC}"
        docker exec "$traefik_container" cat /etc/traefik/traefik.yml 2>/dev/null | head -20 || echo "  Could not read configuration"
        
        # Check Traefik logs for errors
        echo -e "\n${YELLOW}Recent Traefik logs (last 10 lines):${NC}"
        docker logs "$traefik_container" --tail=10 2>/dev/null | grep -E "(ERROR|WARN|domain|router)" || echo "  No relevant logs found"
        
    else
        error "No Traefik container found"
        echo -e "\n${YELLOW}Running containers:${NC}"
        docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    fi
}

# Check domain resolution
check_domain_resolution() {
    echo -e "\n${BLUE}=== Domain Resolution ===${NC}"
    
    local domains=()
    
    # Production domains
    if [[ -n "${DOMAIN:-}" ]]; then
        domains+=("$DOMAIN")
    fi
    
    if [[ -n "${DOMAIN_ALIAS_1:-}" ]]; then
        domains+=("$DOMAIN_ALIAS_1")
    fi
    
    if [[ -n "${DOMAIN_ALIAS_2:-}" ]]; then
        domains+=("$DOMAIN_ALIAS_2")
    fi
    
    # Test domains
    if [[ -n "${TEST_DOMAIN_1:-}" ]]; then
        domains+=("$TEST_DOMAIN_1")
    fi
    
    if [[ -n "${TEST_DOMAIN_2:-}" ]]; then
        domains+=("$TEST_DOMAIN_2")
    fi
    
    for domain in "${domains[@]}"; do
        echo -n "Checking $domain... "
        if nslookup "$domain" > /dev/null 2>&1; then
            success "resolves"
        else
            warning "does not resolve"
        fi
    done
}

# Check Traefik dashboard (if available)
check_traefik_dashboard() {
    echo -e "\n${BLUE}=== Traefik Dashboard ===${NC}"
    
    local traefik_container
    traefik_container=$(docker ps --format "{{.Names}}" | grep -i traefik | head -1)
    
    if [[ -n "$traefik_container" ]]; then
        # Check if dashboard is enabled
        if docker exec "$traefik_container" cat /etc/traefik/traefik.yml 2>/dev/null | grep -q "dashboard"; then
            success "Dashboard is enabled"
            
            # Try to find dashboard port
            local dashboard_port
            dashboard_port=$(docker exec "$traefik_container" cat /etc/traefik/traefik.yml 2>/dev/null | grep -A 5 "dashboard" | grep "port" | grep -o "[0-9]*" | head -1)
            
            if [[ -n "$dashboard_port" ]]; then
                echo "  Dashboard port: $dashboard_port"
                echo "  Access URL: http://localhost:$dashboard_port"
            fi
        else
            warning "Dashboard not found in configuration"
        fi
    fi
}

# Check for common issues
check_common_issues() {
    echo -e "\n${BLUE}=== Common Issues Check ===${NC}"
    
    # Check if containers are in the right network
    local network="${TRAEFIK_NETWORK:-traefik_public}"
    local containers=("${COMPOSE_PROJECT_NAME:-minis}-web-1" "${COMPOSE_PROJECT_NAME:-minis}-web-2")
    
    for container in "${containers[@]}"; do
        if docker inspect "$container" 2>/dev/null | grep -q "$network"; then
            success "$container is in $network network"
        else
            error "$container is NOT in $network network"
        fi
    done
    
    # Check if Traefik can see the containers
    local traefik_container
    traefik_container=$(docker ps --format "{{.Names}}" | grep -i traefik | head -1)
    
    if [[ -n "$traefik_container" ]]; then
        echo -e "\n${YELLOW}Containers visible to Traefik:${NC}"
        docker exec "$traefik_container" docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "  Could not check from Traefik container"
    fi
}

# Generate Traefik configuration snippet
generate_config_snippet() {
    echo -e "\n${BLUE}=== Expected Traefik Configuration ===${NC}"
    
    cat << 'EOF'
# Expected Traefik labels for container 1:
labels:
  - "traefik.enable=true"
  - "traefik.docker.network=traefik_public"
  - "traefik.http.services.${COMPOSE_PROJECT_NAME}.loadbalancer.server.port=80"
  
  # Main domain router (load balanced)
  - "traefik.http.routers.${COMPOSE_PROJECT_NAME}.rule=Host(`${DOMAIN}`)"
  - "traefik.http.routers.${COMPOSE_PROJECT_NAME}.entrypoints=websecure"
  - "traefik.http.routers.${COMPOSE_PROJECT_NAME}.tls.certresolver=${CERT_RESOLVER}"
  - "traefik.http.routers.${COMPOSE_PROJECT_NAME}.service=${COMPOSE_PROJECT_NAME}"
  
  # Additional domain aliases (load balanced)
  - "traefik.http.routers.${COMPOSE_PROJECT_NAME}-eiger.rule=Host(`${DOMAIN_ALIAS_1}`)"
  - "traefik.http.routers.${COMPOSE_PROJECT_NAME}-eiger.entrypoints=websecure"
  - "traefik.http.routers.${COMPOSE_PROJECT_NAME}-eiger.tls.certresolver=${CERT_RESOLVER}"
  - "traefik.http.routers.${COMPOSE_PROJECT_NAME}-eiger.service=${COMPOSE_PROJECT_NAME}"

# Expected Traefik labels for container 2:
labels:
  - "traefik.enable=true"
  - "traefik.docker.network=traefik_public"
  - "traefik.http.services.${COMPOSE_PROJECT_NAME}.loadbalancer.server.port=80"
EOF
}

# Main function
main() {
    echo -e "${BLUE}🔍 Traefik Domain Debugging${NC}"
    echo "================================"
    
    # Check prerequisites
    check_docker
    
    # Run all checks
    check_containers
    check_traefik_labels
    check_traefik_network
    check_traefik_service
    check_domain_resolution
    check_traefik_dashboard
    check_common_issues
    
    # Show expected configuration
    generate_config_snippet
    
    echo -e "\n${BLUE}Debugging Complete!${NC}"
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo "1. Check if all containers are running"
    echo "2. Verify Traefik labels are correctly applied"
    echo "3. Ensure containers are in the traefik_public network"
    echo "4. Check Traefik logs for configuration errors"
    echo "5. Verify domain DNS resolution"
}

# Run main function
main "$@"
