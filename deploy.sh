#!/bin/bash

# =================================================================
# Richie's Game Collection - Deployment Script
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

# Function to check if .env exists
check_env_file() {
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from env.example..."
        if [ -f "env.example" ]; then
            cp env.example .env
            print_success ".env file created from template"
            print_status "Please review and modify .env as needed before continuing"
            echo ""
            echo "Key settings to verify:"
            echo "  - DOMAIN: Your actual domain name"
            echo "  - CONTENT_DIR_1 and CONTENT_DIR_2: Which directories to serve (www or www-red)"
            echo "  - Resource limits: CPU_LIMIT, MEMORY_LIMIT"
            echo "  - Port: INTERNAL_PORT (default: 11888)"
            echo ""
            read -p "Press Enter to continue after reviewing .env file..."
        else
            print_error "env.example not found! Cannot create .env file."
            exit 1
        fi
    else
        print_success ".env file found"
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi

    # Check Docker Compose
    if ! docker-compose version &> /dev/null; then
        print_error "Docker Compose is not installed or not working"
        exit 1
    fi

    # Check if Traefik network exists
    if ! docker network ls | grep -q traefik_public; then
        print_warning "traefik_public network not found"
        print_status "Creating traefik_public network..."
        docker network create traefik_public || true
    fi

    print_success "Prerequisites check completed"
}

# Function to create log directories
create_log_dirs() {
    print_status "Creating log directories..."
    mkdir -p logs/web-1 logs/web-2
    print_success "Log directories created"
}

# Function to validate configuration
validate_config() {
    print_status "Validating Docker Compose configuration..."
    if docker-compose config --quiet; then
        print_success "Docker Compose configuration is valid"
    else
        print_error "Docker Compose configuration is invalid"
        exit 1
    fi
}

# Function to build containers
build_containers() {
    print_status "Building Docker containers..."
    docker-compose build --no-cache
    print_success "Containers built successfully"
}

# Function to start services
start_services() {
    print_status "Starting services..."
    docker-compose up -d

    # Wait a moment for containers to start
    sleep 5

    # Check if containers are running
    if docker-compose ps | grep -q "Up"; then
        print_success "Services started successfully"
    else
        print_error "Some services failed to start"
        docker-compose logs
        exit 1
    fi
}

# Function to show status
show_status() {
    echo ""
    print_status "Deployment Status:"
    echo ""

    # Show container status
    docker-compose ps
    echo ""

    # Show configured domain
    DOMAIN=$(grep "^DOMAIN=" .env 2>/dev/null | cut -d'=' -f2 || echo "minis.richie.ch")
    PORT1=$(grep "^INTERNAL_PORT_1=" .env 2>/dev/null | cut -d'=' -f2 || echo "11888")
    PORT2=$(grep "^INTERNAL_PORT_2=" .env 2>/dev/null | cut -d'=' -f2 || echo "11889")

    print_success "Your games are accessible at:"
    echo "  🌐 External URL: https://${DOMAIN}"
    echo "  🔧 Health Check: https://${DOMAIN}/health"
    echo "  📊 Internal Ports: ${PORT1}, ${PORT2}"
    echo ""

    print_status "Useful commands:"
    echo "  📝 View logs: docker-compose logs -f"
    echo "  🔄 Restart: docker-compose restart"
    echo "  ⏹️  Stop: docker-compose down"
    echo "  📈 Monitor: docker stats"
}

# Main deployment process
main() {
    echo ""
    echo "=========================================="
    echo "🎮 Richie's Game Collection Deployment  "
    echo "=========================================="
    echo ""

    # Check if we're in the right directory
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found. Are you in the right directory?"
        exit 1
    fi

    check_env_file
    check_prerequisites
    create_log_dirs
    validate_config
    build_containers
    start_services
    show_status

    echo ""
    print_success "🎉 Deployment completed successfully!"
    echo ""
}

# Handle script arguments
case "${1:-}" in
    "stop")
        print_status "Stopping services..."
        docker-compose down
        print_success "Services stopped"
        ;;
    "restart")
        print_status "Restarting services..."
        docker-compose restart
        print_success "Services restarted"
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "status")
        docker-compose ps
        ;;
    "rebuild")
        print_status "Rebuilding and restarting..."
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        print_success "Rebuild completed"
        ;;
    "clean")
        print_warning "This will stop containers and remove images"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down
            docker-compose build --no-cache
            docker system prune -f
            print_success "Cleanup completed"
        fi
        ;;
    "" | "deploy")
        main
        ;;
    *)
        echo "Usage: $0 [deploy|stop|restart|logs|status|rebuild|clean]"
        echo ""
        echo "Commands:"
        echo "  deploy   - Full deployment (default)"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  logs     - Show container logs"
        echo "  status   - Show container status"
        echo "  rebuild  - Rebuild containers and restart"
        echo "  clean    - Stop and clean up containers/images"
        exit 1
        ;;
esac
