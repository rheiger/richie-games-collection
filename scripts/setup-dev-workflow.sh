#!/bin/bash

# Development Workflow Setup
# Configures MacBook → Linux server development workflow
# Usage: ./setup-dev-workflow.sh

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

# Detect platform
detect_platform() {
    local platform=""
    case "$(uname -s)" in
        Darwin*)
            platform="macos"
            ;;
        Linux*)
            platform="linux"
            ;;
        *)
            platform="unknown"
            ;;
    esac
    echo "$platform"
}

# Setup for MacBook (Development)
setup_macos() {
    log "Setting up MacBook development environment..."
    
    # Create local development config
    if [[ ! -f .env.local ]]; then
        log "Creating local development configuration..."
        cp env.example .env.local
        
        # Adjust for local development
        sed -i '' 's/COMPOSE_PROJECT_NAME=minis/COMPOSE_PROJECT_NAME=minis-dev/' .env.local
        sed -i '' 's/DOMAIN=minis.richie.ch/DOMAIN=localhost/' .env.local
        sed -i '' 's/TIMEZONE=Europe\/Zurich/TIMEZONE=Europe\/Zurich/' .env.local
        
        success "Created .env.local for MacBook development"
    fi
    
    # Create useful aliases
    log "Setting up development aliases..."
    
    local shell_config=""
    if [[ "$SHELL" == *"zsh"* ]]; then
        shell_config="$HOME/.zshrc"
    elif [[ "$SHELL" == *"bash"* ]]; then
        shell_config="$HOME/.bashrc"
    fi
    
    if [[ -n "$shell_config" ]]; then
        echo "" >> "$shell_config"
        echo "# Richie's Games Collection aliases" >> "$shell_config"
        echo "alias games-deploy='git checkout main && git pull origin main && git push origin main'" >> "$shell_config"
        echo "alias games-feature='f() { git checkout main && git pull && git checkout -b feature/\$1; }; f'" >> "$shell_config"
        echo "alias games-hotfix='f() { git checkout main && git pull && git checkout -b hotfix/\$1; }; f'" >> "$shell_config"
        echo "# Add your Linux server details here:" >> "$shell_config"
        echo "# alias games-check='ssh rheiger@YOUR_SERVER \"cd /path/to/minis && ./scripts/health-check.sh\"'" >> "$shell_config"
        echo "# alias games-logs='ssh rheiger@YOUR_SERVER \"cd /path/to/minis && docker-compose logs -f\"'" >> "$shell_config"
        
        success "Added development aliases to $shell_config"
        warning "Restart your terminal or run 'source $shell_config' to activate aliases"
    fi
    
    # Setup Git hooks (optional)
    log "Setting up Git hooks..."
    mkdir -p .git/hooks
    
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Pre-commit hook to validate docker-compose configuration
echo "🔍 Validating docker-compose configuration..."
if ! docker-compose -f docker-compose.yml config > /dev/null 2>&1; then
    echo "❌ docker-compose configuration is invalid"
    exit 1
fi
echo "✅ docker-compose configuration is valid"
EOF
    
    chmod +x .git/hooks/pre-commit
    success "Git pre-commit hook installed"
    
    # VS Code settings (if VS Code is installed)
    if command -v code &> /dev/null; then
        log "Configuring VS Code settings..."
        mkdir -p .vscode
        
        cat > .vscode/settings.json << 'EOF'
{
    "files.associations": {
        "*.env*": "env",
        "Dockerfile": "dockerfile",
        "docker-compose*.yml": "yaml"
    },
    "docker.defaultRegistry": "",
    "docker.imageBuildContextPath": "${workspaceFolder}",
    "editor.rulers": [80, 120],
    "files.trimTrailingWhitespace": true,
    "files.insertFinalNewline": true,
    "yaml.schemas": {
        "https://raw.githubusercontent.com/compose-spec/compose-spec/master/schema/compose-spec.json": [
            "docker-compose*.yml"
        ]
    }
}
EOF
        
        cat > .vscode/extensions.json << 'EOF'
{
    "recommendations": [
        "ms-vscode-remote.remote-ssh",
        "ms-azuretools.vscode-docker",
        "redhat.vscode-yaml",
        "ms-vscode.vscode-json"
    ]
}
EOF
        
        success "VS Code configuration created"
    fi
    
    echo ""
    echo -e "${BLUE}🎉 MacBook Development Setup Complete!${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Edit .env.local if you want different local settings"
    echo "2. Use 'docker-compose -f docker-compose.yml --env-file .env.local up -d' for local testing"
    echo "3. Configure your Linux server using the commands below"
    echo "4. Start developing! Push to main branch will auto-deploy to Linux server"
    echo ""
}

# Setup for Linux Server (Production)
setup_linux() {
    log "Setting up Linux server environment..."
    
    # Check if running on the target server
    if [[ ! -f /etc/os-release ]]; then
        error "This doesn't appear to be a Linux system"
        exit 1
    fi
    
    # Create production config if it doesn't exist
    if [[ ! -f .env ]]; then
        log "Creating production configuration..."
        cp env.example .env
        success "Created .env for Linux production"
        warning "Please edit .env with your production settings!"
    fi
    
    # Offer CI/CD setup
    echo ""
    echo -e "${YELLOW}Choose your CI/CD approach:${NC}"
    echo "1. GitHub Actions (Recommended) - Most comprehensive"
    echo "2. Webhook Server - Simple and fast"
    echo "3. Manual deployment only"
    echo -n "Enter choice [1-3]: "
    read -r choice
    
    case $choice in
        1)
            log "Setting up GitHub Actions..."
            if [[ -x "scripts/setup-cicd.sh" ]]; then
                ./scripts/setup-cicd.sh --runner
            else
                error "setup-cicd.sh script not found or not executable"
            fi
            ;;
        2)
            log "Setting up Webhook server..."
            if [[ -x "scripts/setup-cicd.sh" ]]; then
                ./scripts/setup-cicd.sh --webhook
            else
                error "setup-cicd.sh script not found or not executable"
            fi
            ;;
        3)
            log "Skipping CI/CD setup - manual deployment only"
            ;;
        *)
            warning "Invalid choice, skipping CI/CD setup"
            ;;
    esac
    
    # Create monitoring script
    log "Setting up monitoring..."
    if [[ -f "scripts/health-check.sh" ]]; then
        # Create monitoring cron job
        (crontab -l 2>/dev/null || echo "") | grep -v "health-check.sh" | \
        { cat; echo "*/5 * * * * cd $(pwd) && ./scripts/health-check.sh --timeout=30 >> logs/health-monitor.log 2>&1"; } | \
        crontab -
        success "Health monitoring cron job installed (runs every 5 minutes)"
    fi
    
    echo ""
    echo -e "${BLUE}🎉 Linux Server Setup Complete!${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Edit .env with your production settings (domain, ports, etc.)"
    echo "2. If using GitHub Actions: Configure secrets in GitHub repository"
    echo "3. If using Webhook: Configure webhook in GitHub repository"
    echo "4. Test deployment: git push from your MacBook!"
    echo ""
}

# Generate SSH key pair for deployment
generate_ssh_keys() {
    log "Generating SSH key pair for deployment..."
    
    local key_path="$HOME/.ssh/deploy_games"
    
    if [[ -f "$key_path" ]]; then
        warning "SSH key already exists: $key_path"
        echo -n "Regenerate? [y/N]: "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    ssh-keygen -t ed25519 -f "$key_path" -N "" -C "games-deployment-$(date +%Y%m%d)"
    
    success "SSH key pair generated:"
    echo "Private key: $key_path"
    echo "Public key: $key_path.pub"
    echo ""
    echo -e "${YELLOW}Setup Instructions:${NC}"
    echo "1. Add public key to your Linux server:"
    echo "   ssh-copy-id -i $key_path.pub rheiger@your-linux-server.com"
    echo ""
    echo "2. Add private key to GitHub secrets:"
    echo "   Repository → Settings → Secrets → Actions → SSH_PRIVATE_KEY"
    echo "   Copy the content of: $key_path"
    echo ""
}

# Main setup function
main() {
    echo -e "${BLUE}🚀 Development Workflow Setup${NC}"
    echo "================================"
    echo ""
    
    local platform
    platform=$(detect_platform)
    
    case "$platform" in
        macos)
            echo -e "${GREEN}Detected: macOS (Development Machine)${NC}"
            echo ""
            setup_macos
            
            echo -e "${YELLOW}SSH Key Setup:${NC}"
            echo -n "Generate SSH keys for deployment? [y/N]: "
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                generate_ssh_keys
            fi
            ;;
        linux)
            echo -e "${GREEN}Detected: Linux (Production Server)${NC}"
            echo ""
            setup_linux
            ;;
        *)
            error "Unsupported platform: $platform"
            echo "This script supports macOS (development) and Linux (production)"
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${BLUE}📚 Additional Resources:${NC}"
    echo "• Development Guide: DEVELOPMENT.md"
    echo "• CI/CD Documentation: CICD.md"
    echo "• Architecture Overview: ARCHITECTURE.md"
    echo "• Health Monitoring: ./scripts/health-check.sh --help"
    echo ""
    echo -e "${GREEN}Happy coding! 🎮${NC}"
}

# Run main function
main "$@"