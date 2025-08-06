#!/bin/bash

# Enhanced deployment script with rollback capabilities
# Usage: ./deploy.sh [--automated] [--skip-backup] [--force]

set -euo pipefail

# Configuration
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-minis}"
BACKUP_DIR="./backups"
MAX_BACKUPS=5
AUTOMATED=false
SKIP_BACKUP=false
FORCE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --automated)
            AUTOMATED=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--automated] [--skip-backup] [--force]"
            echo "  --automated    Skip interactive prompts"
            echo "  --skip-backup  Skip backup creation"
            echo "  --force        Force deployment even if health checks fail"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Pre-deployment checks
pre_deploy_checks() {
    log "Running pre-deployment checks..."
    
    # Check if docker and docker-compose are available
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check if .env file exists
    if [[ ! -f .env ]]; then
        warning ".env file not found, copying from env.example"
        cp env.example .env
    fi
    
    # Validate docker-compose configuration
    if ! docker-compose config > /dev/null 2>&1; then
        error "Invalid docker-compose configuration"
        exit 1
    fi
    
    success "Pre-deployment checks passed"
}

# Create backup
create_backup() {
    if [[ "$SKIP_BACKUP" == "true" ]]; then
        log "Skipping backup creation"
        return
    fi
    
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Create backup with timestamp
    BACKUP_NAME="backup_$(date +'%Y%m%d_%H%M%S')"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup configuration files
    cp -f .env "$BACKUP_PATH/" 2>/dev/null || true
    cp -f docker-compose.yml "$BACKUP_PATH/" 2>/dev/null || true
    
    # Backup logs if they exist
    if [[ -d logs ]]; then
        cp -r logs "$BACKUP_PATH/" 2>/dev/null || true
    fi
    
    # Store current container info
    docker-compose ps --format json > "$BACKUP_PATH/containers.json" 2>/dev/null || true
    
    # Create backup info file
    cat > "$BACKUP_PATH/backup_info.txt" << EOF
Backup created: $(date)
Git commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
Git branch: $(git branch --show-current 2>/dev/null || echo "unknown")
Docker Compose version: $(docker-compose version --short 2>/dev/null || echo "unknown")
EOF
    
    success "Backup created: $BACKUP_PATH"
    
    # Clean up old backups
    cleanup_old_backups
}

cleanup_old_backups() {
    log "Cleaning up old backups (keeping last $MAX_BACKUPS)..."
    
    if [[ -d "$BACKUP_DIR" ]]; then
        cd "$BACKUP_DIR"
        ls -1t | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm -rf
        cd - > /dev/null
    fi
}

# Deploy function
deploy() {
    log "Starting deployment..."
    
    # Pull latest images if using remote registry
    log "Pulling latest images..."
    docker-compose pull || warning "Some images could not be pulled (using local builds)"
    
    # Build images
    log "Building images..."
    docker-compose build --no-cache
    
    # Stop existing containers gracefully
    log "Stopping existing containers..."
    docker-compose down --timeout 30 || true
    
    # Start new containers
    log "Starting new containers..."
    docker-compose up -d
    
    success "Containers started"
}

# Health check function
health_check() {
    log "Running health checks..."
    
    local max_attempts=30
    local attempt=1
    local health_ok=false
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Health check attempt $attempt/$max_attempts..."
        
        # Check if containers are running
        if ! docker-compose ps | grep -q "Up"; then
            warning "Some containers are not running"
            sleep 5
            ((attempt++))
            continue
        fi
        
        # Check health endpoints
        if curl -sf http://localhost:11888/health > /dev/null && \
           curl -sf http://localhost:11889/health > /dev/null; then
            health_ok=true
            break
        fi
        
        sleep 5
        ((attempt++))
    done
    
    if [[ "$health_ok" == "true" ]]; then
        success "Health checks passed"
        return 0
    else
        error "Health checks failed after $max_attempts attempts"
        return 1
    fi
}

# Post-deployment tasks
post_deploy() {
    log "Running post-deployment tasks..."
    
    # Show container status
    log "Container status:"
    docker-compose ps
    
    # Show logs for any failed containers
    if docker-compose ps | grep -q "Exit"; then
        warning "Some containers have failed, showing logs:"
        docker-compose logs --tail=50
    fi
    
    # Log deployment success
    log "Deployment completed at $(date)"
    
    # Update deployment info
    cat > deployment_info.txt << EOF
Last deployment: $(date)
Git commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
Git branch: $(git branch --show-current 2>/dev/null || echo "unknown")
Docker images:
$(docker-compose images)
Container status:
$(docker-compose ps)
EOF
    
    success "Post-deployment tasks completed"
}

# Rollback function
rollback_on_failure() {
    error "Deployment failed, rolling back..."
    
    # Stop failed containers
    docker-compose down --timeout 10 || true
    
    # Find the most recent backup
    if [[ -d "$BACKUP_DIR" ]]; then
        LATEST_BACKUP=$(ls -1t "$BACKUP_DIR" | head -n 1)
        if [[ -n "$LATEST_BACKUP" ]]; then
            warning "Restoring from backup: $LATEST_BACKUP"
            
            # Restore configuration
            cp "$BACKUP_DIR/$LATEST_BACKUP/.env" . 2>/dev/null || true
            cp "$BACKUP_DIR/$LATEST_BACKUP/docker-compose.yml" . 2>/dev/null || true
            
            # Start previous version
            docker-compose up -d || error "Rollback failed"
            
            warning "Rollback completed, please check the system manually"
        else
            error "No backup found for rollback"
        fi
    else
        error "No backup directory found for rollback"
    fi
}

# Main deployment flow
main() {
    log "Starting deployment process for $PROJECT_NAME"
    log "Mode: $([ "$AUTOMATED" == "true" ] && echo "AUTOMATED" || echo "INTERACTIVE")"
    
    # Interactive confirmation if not automated
    if [[ "$AUTOMATED" != "true" ]]; then
        echo -n "Continue with deployment? [y/N]: "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log "Deployment cancelled by user"
            exit 0
        fi
    fi
    
    # Set trap for cleanup on failure
    trap rollback_on_failure ERR
    
    # Execute deployment steps
    pre_deploy_checks
    create_backup
    deploy
    
    # Health checks with retry logic
    if ! health_check; then
        if [[ "$FORCE" != "true" ]]; then
            error "Health checks failed, deployment aborted"
            exit 1
        else
            warning "Health checks failed but continuing due to --force flag"
        fi
    fi
    
    post_deploy
    
    # Remove trap on success
    trap - ERR
    
    success "🎉 Deployment completed successfully!"
    
    # Show quick access info
    echo -e "\n${BLUE}Quick Access:${NC}"
    echo "  • Direct access: http://localhost:11888 and http://localhost:11889"
    echo "  • Public URL: https://$(grep DOMAIN .env | cut -d= -f2 2>/dev/null || echo 'minis.richie.ch')"
    echo "  • Container logs: docker-compose logs -f"
    echo "  • Container status: docker-compose ps"
}

# Run main function
main "$@"