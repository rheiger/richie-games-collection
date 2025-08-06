#!/bin/bash

# Local Testing Script for MacBook Development
# Tests the application locally before pushing to Linux server
# Usage: ./scripts/local-test.sh [--build] [--logs] [--stop]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.local.yml"
ENV_FILE=".env.local"

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

# Parse arguments
BUILD=false
SHOW_LOGS=false
STOP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build)
            BUILD=true
            shift
            ;;
        --logs)
            SHOW_LOGS=true
            shift
            ;;
        --stop)
            STOP=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--build] [--logs] [--stop]"
            echo "  --build    Force rebuild of Docker images"
            echo "  --logs     Show container logs after startup"
            echo "  --stop     Stop local test environment"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Stop local environment
stop_local() {
    log "Stopping local test environment..."
    docker-compose $COMPOSE_FILES --env-file="$ENV_FILE" down || true
    success "Local environment stopped"
}

# Start local environment
start_local() {
    log "Starting local test environment..."
    
    # Check if env file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        warning "$ENV_FILE not found, creating from template..."
        cp env.example "$ENV_FILE"
        
        # Adjust for local development
        sed -i '' 's/COMPOSE_PROJECT_NAME=minis/COMPOSE_PROJECT_NAME=minis-local/' "$ENV_FILE" || true
        sed -i '' 's/DOMAIN=minis.richie.ch/DOMAIN=localhost/' "$ENV_FILE" || true
        
        success "Created $ENV_FILE for local testing"
    fi
    
    # Build if requested or if images don't exist
    if [[ "$BUILD" == "true" ]]; then
        log "Building Docker images..."
        docker-compose $COMPOSE_FILES --env-file="$ENV_FILE" build --no-cache
        success "Images built"
    fi
    
    # Start containers
    log "Starting containers..."
    docker-compose $COMPOSE_FILES --env-file="$ENV_FILE" up -d
    
    # Wait for containers to be ready
    log "Waiting for containers to start..."
    sleep 5
    
    # Check container status
    local containers_up=0
    for i in {1..30}; do
        if docker-compose $COMPOSE_FILES --env-file="$ENV_FILE" ps | grep -q "Up"; then
            containers_up=1
            break
        fi
        sleep 1
    done
    
    if [[ $containers_up -eq 1 ]]; then
        success "Containers are running"
    else
        error "Containers failed to start"
        docker-compose $COMPOSE_FILES --env-file="$ENV_FILE" logs
        return 1
    fi
}

# Run health checks
run_health_checks() {
    log "Running health checks..."
    
    local health_passed=true
    
    # Check if ports are accessible
    for port in 11888 11889; do
        if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
            success "Port $port health check passed"
        else
            error "Port $port health check failed"
            health_passed=false
        fi
    done
    
    # Check main pages
    for port in 11888 11889; do
        local response_code
        response_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/" 2>/dev/null || echo "000")
        
        if [[ "$response_code" == "200" ]]; then
            success "Port $port main page check passed (HTTP $response_code)"
        else
            error "Port $port main page check failed (HTTP $response_code)"
            health_passed=false
        fi
    done
    
    if [[ "$health_passed" == "true" ]]; then
        success "All health checks passed!"
        return 0
    else
        error "Some health checks failed"
        return 1
    fi
}

# Show access information
show_access_info() {
    echo ""
    echo -e "${BLUE}🎮 Local Test Environment Ready!${NC}"
    echo "================================="
    echo ""
    echo -e "${GREEN}Access URLs:${NC}"
    echo "  • Container 1: http://localhost:11888"
    echo "  • Container 2: http://localhost:11889"
    echo "  • Health checks: http://localhost:11888/health"
    echo ""
    echo -e "${BLUE}Quick Commands:${NC}"
    echo "  • Show logs: docker-compose $COMPOSE_FILES --env-file=$ENV_FILE logs -f"
    echo "  • Stop: ./scripts/local-test.sh --stop"
    echo "  • Rebuild: ./scripts/local-test.sh --build"
    echo ""
}

# Show container logs
show_logs() {
    if [[ "$SHOW_LOGS" == "true" ]]; then
        log "Container logs:"
        docker-compose $COMPOSE_FILES --env-file="$ENV_FILE" logs --tail=20
    fi
}

# Main function
main() {
    echo -e "${BLUE}🧪 Local Testing Environment${NC}"
    echo "============================="
    
    # Handle stop command
    if [[ "$STOP" == "true" ]]; then
        stop_local
        return 0
    fi
    
    # Check if Docker is running
    if ! docker ps > /dev/null 2>&1; then
        error "Docker is not running or not accessible"
        echo "Please start Docker Desktop and try again"
        exit 1
    fi
    
    # Start local environment
    start_local
    
    # Run health checks
    if run_health_checks; then
        show_access_info
        show_logs
        
        echo -e "${YELLOW}Testing Notes:${NC}"
        echo "• This is local testing on macOS - production builds happen on Linux server"
        echo "• Push to main branch will trigger automatic deployment to production"
        echo "• Use Ctrl+C to stop log viewing, containers keep running"
        
        if [[ "$SHOW_LOGS" == "true" ]]; then
            echo ""
            log "Following logs (Ctrl+C to exit)..."
            docker-compose $COMPOSE_FILES --env-file="$ENV_FILE" logs -f
        fi
    else
        error "Health checks failed - check logs for issues"
        docker-compose $COMPOSE_FILES --env-file="$ENV_FILE" logs
        exit 1
    fi
}

# Check for required tools
for tool in docker docker-compose curl; do
    if ! command -v "$tool" &>/dev/null; then
        error "Required tool not found: $tool"
        echo "Please install Docker Desktop for Mac and try again"
        exit 1
    fi
done

# Run main function
main "$@"