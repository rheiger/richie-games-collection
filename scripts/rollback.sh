#!/bin/bash

# Rollback script for emergency recovery
# Usage: ./rollback.sh [--list] [--to=backup_name] [--yes]

set -euo pipefail

# Configuration
BACKUP_DIR="./backups"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-minis}"
CONFIRM=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
BACKUP_NAME=""
LIST_BACKUPS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --list)
            LIST_BACKUPS=true
            shift
            ;;
        --to=*)
            BACKUP_NAME="${1#*=}"
            shift
            ;;
        --yes)
            CONFIRM=false
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--list] [--to=backup_name] [--yes]"
            echo "  --list              List available backups"
            echo "  --to=backup_name    Rollback to specific backup"
            echo "  --yes               Skip confirmation prompt"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

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

# List available backups
list_backups() {
    echo -e "${BLUE}Available Backups:${NC}"
    echo "==================="
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        warning "No backup directory found"
        return 1
    fi
    
    if [[ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]]; then
        warning "No backups found in $BACKUP_DIR"
        return 1
    fi
    
    echo -e "Name\t\t\tCreated\t\t\tGit Commit"
    echo "----\t\t\t-------\t\t\t----------"
    
    for backup in $(ls -1t "$BACKUP_DIR"); do
        if [[ -d "$BACKUP_DIR/$backup" ]]; then
            local backup_info=""
            local git_commit="unknown"
            local created="unknown"
            
            if [[ -f "$BACKUP_DIR/$backup/backup_info.txt" ]]; then
                created=$(grep "Backup created:" "$BACKUP_DIR/$backup/backup_info.txt" | cut -d: -f2- | xargs)
                git_commit=$(grep "Git commit:" "$BACKUP_DIR/$backup/backup_info.txt" | cut -d: -f2 | xargs)
            fi
            
            printf "%-20s\t%-20s\t%.8s\n" "$backup" "$created" "$git_commit"
        fi
    done
    
    return 0
}

# Get the latest backup
get_latest_backup() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        error "No backup directory found"
        return 1
    fi
    
    local latest
    latest=$(ls -1t "$BACKUP_DIR" | head -n 1)
    
    if [[ -z "$latest" ]]; then
        error "No backups found"
        return 1
    fi
    
    echo "$latest"
}

# Validate backup
validate_backup() {
    local backup_path="$1"
    
    if [[ ! -d "$backup_path" ]]; then
        error "Backup directory not found: $backup_path"
        return 1
    fi
    
    # Check for essential files
    local required_files=(".env")
    local optional_files=("docker-compose.yml" "backup_info.txt")
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$backup_path/$file" ]]; then
            error "Required backup file missing: $file"
            return 1
        fi
    done
    
    success "Backup validation passed"
    return 0
}

# Create pre-rollback backup
create_pre_rollback_backup() {
    log "Creating pre-rollback backup..."
    
    local timestamp
    timestamp=$(date +'%Y%m%d_%H%M%S')
    local pre_rollback_dir="$BACKUP_DIR/pre_rollback_$timestamp"
    
    mkdir -p "$pre_rollback_dir"
    
    # Backup current state
    cp -f .env "$pre_rollback_dir/" 2>/dev/null || true
    cp -f docker-compose.yml "$pre_rollback_dir/" 2>/dev/null || true
    
    # Backup logs
    if [[ -d logs ]]; then
        cp -r logs "$pre_rollback_dir/" 2>/dev/null || true
    fi
    
    # Store current container info
    docker-compose ps --format json > "$pre_rollback_dir/containers.json" 2>/dev/null || true
    
    # Create rollback info file
    cat > "$pre_rollback_dir/backup_info.txt" << EOF
Pre-rollback backup created: $(date)
Git commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
Git branch: $(git branch --show-current 2>/dev/null || echo "unknown")
Rollback reason: Emergency rollback initiated
EOF
    
    success "Pre-rollback backup created: $pre_rollback_dir"
}

# Perform rollback
perform_rollback() {
    local backup_path="$1"
    local backup_name
    backup_name=$(basename "$backup_path")
    
    log "Rolling back to: $backup_name"
    
    # Validate backup first
    if ! validate_backup "$backup_path"; then
        error "Backup validation failed, aborting rollback"
        return 1
    fi
    
    # Create pre-rollback backup
    create_pre_rollback_backup
    
    # Stop current containers
    log "Stopping current containers..."
    docker-compose down --timeout 30 || {
        warning "Graceful shutdown failed, forcing stop..."
        docker-compose down --timeout 5 || true
    }
    
    # Restore configuration files
    log "Restoring configuration..."
    
    cp "$backup_path/.env" . || {
        error "Failed to restore .env file"
        return 1
    }
    
    if [[ -f "$backup_path/docker-compose.yml" ]]; then
        cp "$backup_path/docker-compose.yml" .
        log "Restored docker-compose.yml"
    fi
    
    # Restore logs if they exist and current logs directory is empty
    if [[ -d "$backup_path/logs" && ! -d logs ]]; then
        cp -r "$backup_path/logs" .
        log "Restored logs directory"
    fi
    
    # Rebuild and start containers with restored configuration
    log "Starting containers with restored configuration..."
    
    # Build images (in case Dockerfile changes need to be reverted)
    docker-compose build --no-cache || {
        error "Failed to build images"
        return 1
    }
    
    # Start containers
    docker-compose up -d || {
        error "Failed to start containers"
        return 1
    }
    
    # Wait for containers to be ready
    log "Waiting for containers to start..."
    sleep 10
    
    # Basic health check
    if ./scripts/health-check.sh --timeout=30 2>/dev/null; then
        success "Rollback completed successfully"
        
        # Show rollback info
        if [[ -f "$backup_path/backup_info.txt" ]]; then
            echo ""
            echo -e "${BLUE}Restored Configuration:${NC}"
            cat "$backup_path/backup_info.txt"
        fi
        
        return 0
    else
        error "Health check failed after rollback"
        warning "System may be in an unstable state"
        
        echo ""
        echo "Manual verification steps:"
        echo "  • Check containers: docker-compose ps"
        echo "  • Check logs: docker-compose logs"
        echo "  • Access health endpoints: curl http://localhost:11888/health"
        
        return 1
    fi
}

# Main rollback function
main() {
    echo -e "${BLUE}🔄 Rollback Manager for $PROJECT_NAME${NC}"
    echo "===================================="
    
    # Handle list option
    if [[ "$LIST_BACKUPS" == "true" ]]; then
        list_backups
        return $?
    fi
    
    # Determine backup to use
    local backup_to_use=""
    
    if [[ -n "$BACKUP_NAME" ]]; then
        backup_to_use="$BACKUP_DIR/$BACKUP_NAME"
        if [[ ! -d "$backup_to_use" ]]; then
            error "Backup not found: $BACKUP_NAME"
            echo ""
            echo "Available backups:"
            list_backups
            exit 1
        fi
    else
        log "No backup specified, using latest backup..."
        local latest
        if ! latest=$(get_latest_backup); then
            exit 1
        fi
        backup_to_use="$BACKUP_DIR/$latest"
        BACKUP_NAME="$latest"
    fi
    
    # Show backup info
    echo -e "\n${BLUE}Selected Backup:${NC} $BACKUP_NAME"
    if [[ -f "$backup_to_use/backup_info.txt" ]]; then
        cat "$backup_to_use/backup_info.txt"
    fi
    
    # Confirmation
    if [[ "$CONFIRM" == "true" ]]; then
        echo ""
        warning "This will stop current containers and restore from backup."
        warning "Current state will be backed up before rollback."
        echo -n "Continue with rollback? [y/N]: "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            log "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    # Perform rollback
    if perform_rollback "$backup_to_use"; then
        success "🎉 Rollback completed successfully!"
        
        echo -e "\n${BLUE}Next Steps:${NC}"
        echo "  • Verify functionality: ./scripts/health-check.sh --verbose"
        echo "  • Check application: https://$(grep DOMAIN .env | cut -d= -f2 2>/dev/null || echo 'your-domain.com')"
        echo "  • Monitor logs: docker-compose logs -f"
        
        exit 0
    else
        error "❌ Rollback failed"
        echo ""
        echo "Recovery options:"
        echo "  • Try a different backup: ./scripts/rollback.sh --list"
        echo "  • Manual recovery: Check containers and logs"
        echo "  • Emergency contact: [Add your emergency contact info]"
        
        exit 1
    fi
}

# Check for required tools
for tool in docker docker-compose; do
    if ! command -v "$tool" &>/dev/null; then
        error "Required tool not found: $tool"
        exit 1
    fi
done

# Run main function
main "$@"