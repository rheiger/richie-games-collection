#!/bin/bash

# Domain Testing Script
# Tests all configured domains including aliases and direct container access
# Usage: ./scripts/test-domains.sh [--verbose] [--health] [--load-test]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [[ -f "$PROJECT_DIR/.env" ]]; then
    source "$PROJECT_DIR/.env"
elif [[ -f "$PROJECT_DIR/env.example" ]]; then
    echo -e "${YELLOW}Warning: Using env.example for testing${NC}"
    source "$PROJECT_DIR/env.example"
else
    echo -e "${RED}Error: No .env or env.example file found${NC}"
    exit 1
fi

# Parse arguments
VERBOSE=false
HEALTH_CHECK=false
LOAD_TEST=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose)
            VERBOSE=true
            shift
            ;;
        --health)
            HEALTH_CHECK=true
            shift
            ;;
        --load-test)
            LOAD_TEST=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--verbose] [--health] [--load-test]"
            echo "  --verbose    Show detailed response information"
            echo "  --health     Test health endpoints"
            echo "  --load-test  Run basic load testing"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
    shift
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

# Get domain configuration
get_domains() {
    local domains=()
    
    # Production domains (load balanced)
    if [[ -n "${DOMAIN:-}" ]]; then
        domains+=("$DOMAIN")
    fi
    
    if [[ -n "${DOMAIN_ALIAS_1:-}" ]]; then
        domains+=("$DOMAIN_ALIAS_1")
    fi
    
    if [[ -n "${DOMAIN_ALIAS_2:-}" ]]; then
        domains+=("$DOMAIN_ALIAS_2")
    fi
    
    # Test domains (direct container access)
    if [[ -n "${TEST_DOMAIN_1:-}" ]]; then
        domains+=("$TEST_DOMAIN_1")
    fi
    
    if [[ -n "${TEST_DOMAIN_2:-}" ]]; then
        domains+=("$TEST_DOMAIN_2")
    fi
    
    echo "${domains[@]}"
}

# Test domain availability
test_domain() {
    local domain="$1"
    local protocol="${2:-https}"
    local url="$protocol://$domain"
    
    echo -n "Testing $url... "
    
    if curl -sf -m 10 "$url" > /dev/null 2>&1; then
        success "OK"
        return 0
    else
        error "FAILED"
        return 1
    fi
}

# Test domain with detailed response
test_domain_verbose() {
    local domain="$1"
    local protocol="${2:-https}"
    local url="$protocol://$domain"
    
    echo -e "\n${BLUE}=== Testing $url ===${NC}"
    
    # Test basic connectivity
    local response_code
    local response_time
    local server_info
    
    response_code=$(curl -s -o /dev/null -w "%{http_code}" -m 10 "$url" 2>/dev/null || echo "000")
    response_time=$(curl -s -o /dev/null -w "%{time_total}" -m 10 "$url" 2>/dev/null || echo "0.000")
    server_info=$(curl -s -I -m 10 "$url" 2>/dev/null | grep -i "server\|nginx\|container" | head -1 || echo "No server info")
    
    echo "  HTTP Status: $response_code"
    echo "  Response Time: ${response_time}s"
    echo "  Server: $server_info"
    
    # Test health endpoint if available
    if [[ "$HEALTH_CHECK" == "true" ]]; then
        local health_url="$url/health"
        echo -n "  Health Check: "
        if curl -sf -m 10 "$health_url" > /dev/null 2>&1; then
            success "Available"
        else
            warning "Not available"
        fi
    fi
    
    # Show container identification if available
    local container_info
    container_info=$(curl -s -m 10 "$url" 2>/dev/null | grep -i "container=" | head -1 || echo "No container info")
    if [[ "$container_info" != "No container info" ]]; then
        echo "  Container: $container_info"
    fi
}

# Test load balancing
test_load_balancing() {
    local domain="$1"
    local protocol="${2:-https}"
    local url="$protocol://$domain"
    
    echo -e "\n${BLUE}=== Load Balancing Test for $url ===${NC}"
    
    local containers=()
    local total_requests=20
    
    echo "Making $total_requests requests to test load balancing..."
    
    for i in $(seq 1 $total_requests); do
        local response
        response=$(curl -s -m 10 "$url" 2>/dev/null || echo "")
        
        if [[ -n "$response" ]]; then
            local container
            container=$(echo "$response" | grep -o "container=[^\" ]*" | head -1 || echo "unknown")
            containers+=("$container")
            
            if [[ "$VERBOSE" == "true" ]]; then
                echo "  Request $i: $container"
            fi
        fi
        
        # Small delay between requests
        sleep 0.1
    done
    
    # Analyze distribution
    echo -e "\nLoad Balancing Results:"
    local unique_containers
    unique_containers=$(printf '%s\n' "${containers[@]}" | sort | uniq -c | sort -nr)
    
    echo "$unique_containers" | while read -r count container; do
        local percentage
        percentage=$(echo "scale=1; $count * 100 / $total_requests" | bc -l 2>/dev/null || echo "0")
        echo "  $container: $count requests ($percentage%)"
    done
    
    # Check if load balancing is working
    local container_count
    container_count=$(echo "$unique_containers" | wc -l)
    
    if [[ $container_count -gt 1 ]]; then
        success "Load balancing is working (traffic distributed across $container_count containers)"
    else
        warning "Load balancing may not be working (all traffic to single container)"
    fi
}

# Test direct container access
test_direct_access() {
    echo -e "\n${BLUE}=== Direct Container Access Test ===${NC}"
    
    local test_domains=()
    
    if [[ -n "${TEST_DOMAIN_1:-}" ]]; then
        test_domains+=("$TEST_DOMAIN_1")
    fi
    
    if [[ -n "${TEST_DOMAIN_2:-}" ]]; then
        test_domains+=("$TEST_DOMAIN_2")
    fi
    
    if [[ ${#test_domains[@]} -eq 0 ]]; then
        warning "No test domains configured"
        return
    fi
    
    for domain in "${test_domains[@]}"; do
        echo -e "\nTesting direct access to $domain:"
        
        local response
        response=$(curl -s -m 10 "https://$domain" 2>/dev/null || echo "")
        
        if [[ -n "$response" ]]; then
            local container
            container=$(echo "$response" | grep -o "container=[^\" ]*" | head -1 || echo "unknown")
            echo "  Container: $container"
            
            # Check if this matches expected container
            if [[ "$domain" == "${TEST_DOMAIN_1:-}" ]] && [[ "$container" == *"web-1"* ]]; then
                success "Container 1 access working correctly"
            elif [[ "$domain" == "${TEST_DOMAIN_2:-}" ]] && [[ "$container" == *"web-2"* ]]; then
                success "Container 2 access working correctly"
            else
                warning "Unexpected container response: $container"
            fi
        else
            error "Failed to get response from $domain"
        fi
    done
}

# Main testing function
main() {
    echo -e "${BLUE}🌐 Domain Testing Script${NC}"
    echo "========================="
    
    # Check if curl is available
    if ! command -v curl &> /dev/null; then
        error "curl is required but not installed"
        exit 1
    fi
    
    # Get domain configuration
    local domains
    mapfile -t domains < <(get_domains)
    
    if [[ ${#domains[@]} -eq 0 ]]; then
        error "No domains configured in environment"
        exit 1
    fi
    
    echo -e "\n${BLUE}Configured Domains:${NC}"
    for domain in "${domains[@]}"; do
        echo "  • $domain"
    done
    
    # Test basic connectivity
    echo -e "\n${BLUE}Basic Connectivity Test:${NC}"
    local failed_domains=()
    
    for domain in "${domains[@]}"; do
        if ! test_domain "$domain"; then
            failed_domains+=("$domain")
        fi
    done
    
    # Detailed testing for working domains
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "\n${BLUE}Detailed Domain Testing:${NC}"
        for domain in "${domains[@]}"; do
            if [[ ! " ${failed_domains[@]} " =~ " ${domain} " ]]; then
                test_domain_verbose "$domain"
            fi
        done
    fi
    
    # Test direct container access
    test_direct_access
    
    # Test load balancing for production domains
    if [[ "$LOAD_TEST" == "true" ]]; then
        local production_domains=()
        
        if [[ -n "${DOMAIN:-}" ]]; then
            production_domains+=("$DOMAIN")
        fi
        
        if [[ -n "${DOMAIN_ALIAS_1:-}" ]]; then
            production_domains+=("$DOMAIN_ALIAS_1")
        fi
        
        if [[ -n "${DOMAIN_ALIAS_2:-}" ]]; then
            production_domains+=("$DOMAIN_ALIAS_2")
        fi
        
        for domain in "${production_domains[@]}"; do
            test_load_balancing "$domain"
        done
    fi
    
    # Summary
    echo -e "\n${BLUE}Test Summary:${NC}"
    if [[ ${#failed_domains[@]} -eq 0 ]]; then
        success "All domains are accessible"
    else
        error "${#failed_domains[@]} domain(s) failed:"
        for domain in "${failed_domains[@]}"; do
            echo "  • $domain"
        done
    fi
    
    echo -e "\n${BLUE}Testing Complete!${NC}"
}

# Run main function
main "$@"
