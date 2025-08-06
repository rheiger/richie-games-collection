#!/bin/bash

# Comprehensive health check script for the containerized application
# Usage: ./health-check.sh [--verbose] [--timeout=60]

set -euo pipefail

# Configuration
TIMEOUT=60
VERBOSE=false
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-minis}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose)
            VERBOSE=true
            shift
            ;;
        --timeout=*)
            TIMEOUT="${1#*=}"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--verbose] [--timeout=60]"
            echo "  --verbose     Show detailed output"
            echo "  --timeout=N   Timeout in seconds (default: 60)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

log() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
    fi
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

# Health check functions
check_containers() {
    log "Checking container status..."
    
    local containers_up=0
    local containers_total=0
    
    while IFS= read -r line; do
        if [[ "$line" =~ ^[[:space:]]*$ ]]; then
            continue
        fi
        
        containers_total=$((containers_total + 1))
        
        if echo "$line" | grep -q "Up.*healthy"; then
            containers_up=$((containers_up + 1))
            if [[ "$VERBOSE" == "true" ]]; then
                container_name=$(echo "$line" | awk '{print $1}')
                success "Container $container_name is healthy"
            fi
        elif echo "$line" | grep -q "Up"; then
            warning "Container is up but not healthy: $(echo "$line" | awk '{print $1}')"
        else
            error "Container is not running: $(echo "$line" | awk '{print $1}')"
        fi
    done < <(docker-compose ps 2>/dev/null | tail -n +3)
    
    if [[ $containers_up -eq $containers_total && $containers_total -gt 0 ]]; then
        success "All $containers_total containers are healthy"
        return 0
    else
        error "$containers_up/$containers_total containers are healthy"
        return 1
    fi
}

check_ports() {
    log "Checking port accessibility..."
    
    local port1="${INTERNAL_PORT_1:-11888}"
    local port2="${INTERNAL_PORT_2:-11889}"
    local ports_ok=0
    
    for port in "$port1" "$port2"; do
        if nc -z localhost "$port" 2>/dev/null; then
            success "Port $port is accessible"
            ports_ok=$((ports_ok + 1))
        else
            error "Port $port is not accessible"
        fi
    done
    
    if [[ $ports_ok -eq 2 ]]; then
        return 0
    else
        return 1
    fi
}

check_health_endpoints() {
    log "Checking health endpoints..."
    
    local port1="${INTERNAL_PORT_1:-11888}"
    local port2="${INTERNAL_PORT_2:-11889}"
    local endpoints_ok=0
    
    for port in "$port1" "$port2"; do
        if curl -sf "http://localhost:$port/health" >/dev/null 2>&1; then
            success "Health endpoint on port $port is responding"
            endpoints_ok=$((endpoints_ok + 1))
        else
            error "Health endpoint on port $port is not responding"
        fi
    done
    
    if [[ $endpoints_ok -eq 2 ]]; then
        return 0
    else
        return 1
    fi
}

check_main_pages() {
    log "Checking main pages..."
    
    local port1="${INTERNAL_PORT_1:-11888}"
    local port2="${INTERNAL_PORT_2:-11889}"
    local pages_ok=0
    
    for port in "$port1" "$port2"; do
        local response
        response=$(curl -s -w "%{http_code}" "http://localhost:$port/" 2>/dev/null)
        local http_code="${response: -3}"
        
        if [[ "$http_code" == "200" ]]; then
            success "Main page on port $port is responding (HTTP $http_code)"
            pages_ok=$((pages_ok + 1))
        else
            error "Main page on port $port returned HTTP $http_code"
        fi
    done
    
    if [[ $pages_ok -eq 2 ]]; then
        return 0
    else
        return 1
    fi
}

check_logs_for_errors() {
    log "Checking recent logs for errors..."
    
    local error_count=0
    local log_lines=50
    
    # Check for common error patterns in logs
    local error_patterns=(
        "ERROR"
        "FATAL"
        "CRITICAL"
        "failed"
        "connection refused"
        "timeout"
        "500"
        "502"
        "503"
        "504"
    )
    
    local recent_logs
    recent_logs=$(docker-compose logs --tail=$log_lines 2>/dev/null || echo "")
    
    if [[ -n "$recent_logs" ]]; then
        for pattern in "${error_patterns[@]}"; do
            local count
            count=$(echo "$recent_logs" | grep -ci "$pattern" || true)
            if [[ $count -gt 0 ]]; then
                warning "Found $count occurrences of '$pattern' in recent logs"
                error_count=$((error_count + count))
            fi
        done
        
        if [[ $error_count -eq 0 ]]; then
            success "No critical errors found in recent logs"
            return 0
        else
            warning "Found $error_count potential issues in recent logs"
            if [[ "$VERBOSE" == "true" ]]; then
                echo "Recent error logs:"
                echo "$recent_logs" | grep -i "error\|fatal\|critical\|failed" | tail -5 || true
            fi
            return 1
        fi
    else
        warning "Could not retrieve container logs"
        return 1
    fi
}

check_traefik_connectivity() {
    log "Checking Traefik connectivity..."
    
    # Try to check if Traefik can reach the containers
    local domain
    domain=$(grep -E "^DOMAIN=" .env 2>/dev/null | cut -d= -f2 || echo "minis.richie.ch")
    
    # Check if domain resolves locally (useful for testing)
    if command -v dig &>/dev/null; then
        if dig +short "$domain" >/dev/null 2>&1; then
            success "Domain $domain resolves"
        else
            warning "Domain $domain does not resolve (normal for internal testing)"
        fi
    fi
    
    # Check if containers are on traefik network
    local traefik_network="${TRAEFIK_NETWORK:-traefik_public}"
    if docker network ls | grep -q "$traefik_network"; then
        local containers_on_network
        containers_on_network=$(docker network inspect "$traefik_network" --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || echo "")
        
        if echo "$containers_on_network" | grep -q "$PROJECT_NAME"; then
            success "Containers are connected to $traefik_network network"
            return 0
        else
            error "Containers are not connected to $traefik_network network"
            return 1
        fi
    else
        error "Traefik network $traefik_network does not exist"
        return 1
    fi
}

# Resource usage check
check_resources() {
    log "Checking resource usage..."
    
    local stats
    stats=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | grep "$PROJECT_NAME" || echo "")
    
    if [[ -n "$stats" ]]; then
        success "Resource usage:"
        echo "$stats"
        return 0
    else
        warning "Could not retrieve resource usage statistics"
        return 1
    fi
}

# Main health check function
main() {
    echo -e "${BLUE}🏥 Health Check for $PROJECT_NAME${NC}"
    echo "=================================="
    
    local start_time
    start_time=$(date +%s)
    
    local checks_passed=0
    local total_checks=0
    
    # Define health checks
    local health_checks=(
        "check_containers:Container Status"
        "check_ports:Port Accessibility" 
        "check_health_endpoints:Health Endpoints"
        "check_main_pages:Main Pages"
        "check_logs_for_errors:Log Analysis"
        "check_traefik_connectivity:Traefik Connectivity"
    )
    
    # Add resource check if verbose
    if [[ "$VERBOSE" == "true" ]]; then
        health_checks+=("check_resources:Resource Usage")
    fi
    
    # Run health checks
    for check_def in "${health_checks[@]}"; do
        IFS=':' read -r check_func check_name <<< "$check_def"
        total_checks=$((total_checks + 1))
        
        echo ""
        echo -e "${BLUE}Checking: $check_name${NC}"
        
        if timeout "$TIMEOUT" bash -c "declare -f $check_func > /dev/null && $check_func"; then
            checks_passed=$((checks_passed + 1))
        else
            if [[ "$check_func" == "check_logs_for_errors" || "$check_func" == "check_resources" ]]; then
                # These are warnings, not failures
                checks_passed=$((checks_passed + 1))
            fi
        fi
    done
    
    # Final report
    echo ""
    echo "=================================="
    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [[ $checks_passed -eq $total_checks ]]; then
        success "🎉 All health checks passed ($checks_passed/$total_checks) in ${duration}s"
        exit 0
    else
        error "❌ Health check failed ($checks_passed/$total_checks checks passed) in ${duration}s"
        
        echo ""
        echo "Troubleshooting:"
        echo "  • Check container logs: docker-compose logs"
        echo "  • Check container status: docker-compose ps"
        echo "  • Restart containers: docker-compose restart"
        echo "  • Full restart: docker-compose down && docker-compose up -d"
        
        exit 1
    fi
}

# Check for required tools
for tool in docker docker-compose curl nc; do
    if ! command -v "$tool" &>/dev/null; then
        error "Required tool not found: $tool"
        exit 1
    fi
done

# Load environment variables if .env exists
if [[ -f .env ]]; then
    set -a
    source .env
    set +a
fi

# Run main function
main "$@"