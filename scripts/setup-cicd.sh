#!/bin/bash

# CI/CD Setup Script
# Sets up GitHub Actions runner and webhook-based deployment
# Usage: ./setup-cicd.sh [--runner] [--webhook] [--all]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WEBHOOK_PORT=8080
WEBHOOK_USER="deploy"
WEBHOOK_SERVICE="webhook-deploy"
GITHUB_RUNNER_DIR="/opt/actions-runner"

# Parse arguments
SETUP_RUNNER=false
SETUP_WEBHOOK=false

if [[ $# -eq 0 ]]; then
    SETUP_RUNNER=true
    SETUP_WEBHOOK=true
else
    while [[ $# -gt 0 ]]; do
        case $1 in
            --runner)
                SETUP_RUNNER=true
                shift
                ;;
            --webhook)
                SETUP_WEBHOOK=true
                shift
                ;;
            --all)
                SETUP_RUNNER=true
                SETUP_WEBHOOK=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [--runner] [--webhook] [--all]"
                echo "  --runner    Setup GitHub Actions self-hosted runner"
                echo "  --webhook   Setup webhook-based deployment"
                echo "  --all       Setup both (default)"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
fi

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

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root"
        error "Some operations will use sudo when needed"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Update package list
    sudo apt-get update
    
    # Install required packages
    sudo apt-get install -y \
        curl \
        wget \
        tar \
        git \
        docker.io \
        docker-compose \
        python3 \
        python3-pip \
        nginx \
        openssl \
        ufw \
        fail2ban
    
    # Add user to docker group
    sudo usermod -aG docker "$USER"
    
    success "Dependencies installed"
}

# Setup GitHub Actions Self-Hosted Runner
setup_github_runner() {
    if [[ "$SETUP_RUNNER" != "true" ]]; then
        return
    fi
    
    log "Setting up GitHub Actions self-hosted runner..."
    
    # Create runner directory
    sudo mkdir -p "$GITHUB_RUNNER_DIR"
    sudo chown "$USER:$USER" "$GITHUB_RUNNER_DIR"
    cd "$GITHUB_RUNNER_DIR"
    
    # Download latest runner
    log "Downloading GitHub Actions runner..."
    RUNNER_VERSION=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | grep -Po '"tag_name": "v\K[^"]*')
    
    wget -q "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
    tar xzf "./actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
    rm "./actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
    
    # Install dependencies
    sudo ./bin/installdependencies.sh
    
    success "GitHub Actions runner downloaded and dependencies installed"
    
    echo -e "\n${YELLOW}IMPORTANT: Complete runner setup manually:${NC}"
    echo "1. Go to your GitHub repository settings"
    echo "2. Navigate to Actions > Runners > New self-hosted runner"
    echo "3. Run the configuration command provided by GitHub:"
    echo "   cd $GITHUB_RUNNER_DIR"
    echo "   ./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token YOUR_TOKEN"
    echo "4. Install the runner as a service:"
    echo "   sudo ./svc.sh install"
    echo "   sudo ./svc.sh start"
}

# Setup webhook deployment
setup_webhook() {
    if [[ "$SETUP_WEBHOOK" != "true" ]]; then
        return
    fi
    
    log "Setting up webhook deployment..."
    
    # Create webhook user
    if ! id "$WEBHOOK_USER" &>/dev/null; then
        sudo useradd -m -s /bin/bash "$WEBHOOK_USER"
        sudo usermod -aG docker "$WEBHOOK_USER"
        success "Created webhook user: $WEBHOOK_USER"
    fi
    
    # Generate webhook secret
    WEBHOOK_SECRET=$(openssl rand -hex 32)
    
    # Create systemd service file
    cat > "/tmp/${WEBHOOK_SERVICE}.service" << EOF
[Unit]
Description=Webhook Deploy Server
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=$WEBHOOK_USER
WorkingDirectory=$(pwd)
Environment=WEBHOOK_SECRET=$WEBHOOK_SECRET
ExecStart=/usr/bin/python3 $(pwd)/scripts/webhook-deploy.py $WEBHOOK_PORT
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    sudo mv "/tmp/${WEBHOOK_SERVICE}.service" "/etc/systemd/system/"
    sudo systemctl daemon-reload
    sudo systemctl enable "$WEBHOOK_SERVICE"
    
    # Create nginx configuration
    cat > "/tmp/webhook-deploy" << EOF
server {
    listen 80;
    server_name webhook.$(grep DOMAIN .env | cut -d= -f2 2>/dev/null || echo 'your-domain.com');
    
    # Redirect to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name webhook.$(grep DOMAIN .env | cut -d= -f2 2>/dev/null || echo 'your-domain.com');
    
    # SSL configuration (use your existing certificates)
    ssl_certificate /path/to/your/certificate.pem;
    ssl_private_key /path/to/your/private.key;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Rate limiting for webhook endpoint
    limit_req_zone \$binary_remote_addr zone=webhook:10m rate=10r/m;
    
    location / {
        limit_req zone=webhook burst=5 nodelay;
        
        proxy_pass http://127.0.0.1:$WEBHOOK_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Webhook-specific settings
        proxy_read_timeout 300;
        proxy_connect_timeout 10;
        client_max_body_size 10m;
    }
}
EOF
    
    sudo mv "/tmp/webhook-deploy" "/etc/nginx/sites-available/"
    sudo ln -sf "/etc/nginx/sites-available/webhook-deploy" "/etc/nginx/sites-enabled/"
    
    success "Webhook deployment configured"
    
    # Store webhook secret
    echo "WEBHOOK_SECRET=$WEBHOOK_SECRET" | sudo tee "/home/$WEBHOOK_USER/.webhook-secret"
    sudo chown "$WEBHOOK_USER:$WEBHOOK_USER" "/home/$WEBHOOK_USER/.webhook-secret"
    sudo chmod 600 "/home/$WEBHOOK_USER/.webhook-secret"
    
    echo -e "\n${YELLOW}IMPORTANT: Configure GitHub webhook:${NC}"
    echo "1. Go to your GitHub repository settings"
    echo "2. Navigate to Webhooks > Add webhook"
    echo "3. Payload URL: https://webhook.your-domain.com/webhook"
    echo "4. Content type: application/json"
    echo "5. Secret: $WEBHOOK_SECRET"
    echo "6. Events: Just the push event"
    echo ""
    echo "Webhook secret has been saved to: /home/$WEBHOOK_USER/.webhook-secret"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    # Reset UFW to defaults
    sudo ufw --force reset
    
    # Default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH
    sudo ufw allow ssh
    
    # Allow HTTP/HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Allow webhook port (if not using nginx proxy)
    if [[ "$SETUP_WEBHOOK" == "true" ]]; then
        sudo ufw allow "$WEBHOOK_PORT/tcp"
    fi
    
    # Allow Docker ports for direct access
    sudo ufw allow 11888/tcp
    sudo ufw allow 11889/tcp
    
    # Enable firewall
    sudo ufw --force enable
    
    success "Firewall configured"
}

# Configure fail2ban
configure_fail2ban() {
    log "Configuring fail2ban..."
    
    # Create jail configuration
    cat > "/tmp/webhook.conf" << EOF
[webhook]
enabled = true
port = $WEBHOOK_PORT
filter = webhook
logpath = $(pwd)/webhook-deploy.log
maxretry = 5
bantime = 3600
findtime = 600

[nginx-webhook]
enabled = true
port = http,https
filter = nginx-webhook
logpath = /var/log/nginx/access.log
maxretry = 10
bantime = 3600
findtime = 600
EOF
    
    sudo mv "/tmp/webhook.conf" "/etc/fail2ban/jail.d/"
    
    # Create webhook filter
    cat > "/tmp/webhook.conf" << EOF
[Definition]
failregex = ^.*ERROR.*Invalid signature.*$
            ^.*ERROR.*Invalid JSON.*$
ignoreregex =
EOF
    
    sudo mv "/tmp/webhook.conf" "/etc/fail2ban/filter.d/"
    
    # Create nginx webhook filter
    cat > "/tmp/nginx-webhook.conf" << EOF
[Definition]
failregex = ^<HOST>.*"POST /webhook.*" 4\d\d
            ^<HOST>.*"POST /webhook.*" 5\d\d
ignoreregex =
EOF
    
    sudo mv "/tmp/nginx-webhook.conf" "/etc/fail2ban/filter.d/"
    
    sudo systemctl enable fail2ban
    sudo systemctl restart fail2ban
    
    success "Fail2ban configured"
}

# Create monitoring script
create_monitoring() {
    log "Creating monitoring script..."
    
    cat > "scripts/monitor-cicd.sh" << 'EOF'
#!/bin/bash

# CI/CD Monitoring Script
# Checks status of GitHub runner and webhook service

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 CI/CD Status Monitor${NC}"
echo "========================="

# Check GitHub Actions runner
if systemctl is-active --quiet actions.runner.* 2>/dev/null; then
    echo -e "${GREEN}✓${NC} GitHub Actions runner is running"
else
    echo -e "${RED}✗${NC} GitHub Actions runner is not running"
fi

# Check webhook service
if systemctl is-active --quiet webhook-deploy 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Webhook deploy service is running"
    
    # Check webhook endpoint
    if curl -sf http://localhost:8080/health >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Webhook endpoint is responding"
    else
        echo -e "${RED}✗${NC} Webhook endpoint is not responding"
    fi
else
    echo -e "${RED}✗${NC} Webhook deploy service is not running"
fi

# Check Docker
if docker ps >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker is running"
    
    # Check containers
    if docker-compose ps | grep -q "Up.*healthy"; then
        echo -e "${GREEN}✓${NC} Application containers are healthy"
    else
        echo -e "${YELLOW}⚠${NC} Application containers may have issues"
    fi
else
    echo -e "${RED}✗${NC} Docker is not accessible"
fi

# Check recent deployments
echo ""
echo -e "${BLUE}Recent Deployments:${NC}"
if [[ -f "webhook-deploy.log" ]]; then
    grep "Deployment completed\|Deployment failed" webhook-deploy.log | tail -5 || echo "No recent deployment logs found"
else
    echo "No deployment log file found"
fi

# Check disk space
echo ""
echo -e "${BLUE}Disk Usage:${NC}"
df -h . | tail -1

# Check memory usage
echo ""
echo -e "${BLUE}Memory Usage:${NC}"
free -h | head -2
EOF
    
    chmod +x "scripts/monitor-cicd.sh"
    
    success "Monitoring script created"
}

# Main setup function
main() {
    echo -e "${BLUE}🚀 CI/CD Setup Script${NC}"
    echo "====================="
    
    check_root
    
    log "Starting CI/CD setup..."
    log "Components: Runner=$SETUP_RUNNER, Webhook=$SETUP_WEBHOOK"
    
    install_dependencies
    
    if [[ "$SETUP_RUNNER" == "true" ]]; then
        setup_github_runner
    fi
    
    if [[ "$SETUP_WEBHOOK" == "true" ]]; then
        setup_webhook
    fi
    
    configure_firewall
    configure_fail2ban
    create_monitoring
    
    success "🎉 CI/CD setup completed!"
    
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    
    if [[ "$SETUP_RUNNER" == "true" ]]; then
        echo "1. Complete GitHub Actions runner configuration (see instructions above)"
    fi
    
    if [[ "$SETUP_WEBHOOK" == "true" ]]; then
        echo "2. Configure GitHub webhook (see instructions above)"
        echo "3. Update SSL certificates in nginx configuration"
        echo "4. Test webhook: curl -X POST https://webhook.your-domain.com/webhook"
    fi
    
    echo "5. Monitor CI/CD status: ./scripts/monitor-cicd.sh"
    echo "6. Check logs: journalctl -u webhook-deploy -f"
    
    echo ""
    warning "Remember to logout and login again for Docker group changes to take effect"
}

# Run main function
main "$@"