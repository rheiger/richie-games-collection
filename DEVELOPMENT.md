# Cross-Platform Development Guide
## MacBook → Linux Server Deployment

This guide covers the optimal development workflow when developing on macOS (MacBook) and deploying to a Linux server.

## 🏗️ Architecture Overview

```
MacBook (Development)     →     Linux Server (Production)
├── Code editing             ├── Docker builds (x86)
├── Local testing            ├── Container deployment
├── Git commits              ├── Health monitoring
└── Push to GitHub           └── Live application serving
```

## 🎯 Optimal Workflow

### 1. Development Phase (MacBook)
```bash
# Clone repository locally
git clone https://github.com/rheiger/richie-games-collection.git
cd richie-games-collection

# Create feature branch
git checkout -b feature/new-game

# Edit files, test locally (optional)
# Note: Local testing is optional since builds happen on Linux server

# Commit and push
git add .
git commit -m "feat: Add new game feature"
git push origin feature/new-game
```

### 2. Testing Phase (Optional Local)
```bash
# Optional: Test locally on MacBook (will build for ARM64)
docker-compose up -d

# Test in browser
open http://localhost:11888

# Stop when done
docker-compose down
```

### 3. Deployment Phase (Automatic)
```bash
# Merge to main branch (triggers deployment)
git checkout main
git merge feature/new-game
git push origin main

# 🚀 Automatic deployment to Linux server happens now!
```

### 4. Verification Phase (Linux Server)
The CI/CD system automatically:
- ✅ Builds Docker images (native x86)
- ✅ Runs health checks
- ✅ Deploys with zero downtime
- ✅ Notifies you of success/failure

## 🔧 Setup Instructions

### For MacBook (One-time setup)
```bash
# 1. Clone repository
git clone https://github.com/rheiger/richie-games-collection.git
cd richie-games-collection

# 2. Set up development environment
cp env.example .env.local
# Edit .env.local for local development if needed

# 3. Configure Git (if not already done)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 4. Optional: Install local development tools
# Docker Desktop for Mac (if you want to test locally)
# Your preferred code editor (VS Code, etc.)
```

### For Linux Server (One-time setup)
```bash
# SSH to your Linux server
ssh rheiger@your-linux-server.com

# Navigate to deployment directory
cd /home/rheiger/DevOps/
git clone https://github.com/rheiger/richie-games-collection.git minis
cd minis

# Choose your CI/CD approach:

# Option A: GitHub Actions (Recommended)
./scripts/setup-cicd.sh --runner

# Option B: Webhook-based
./scripts/setup-cicd.sh --webhook

# Copy environment configuration
cp env.example .env
# Edit .env with your Linux server-specific settings
```

## 🏅 Best Practices

### Development Workflow
1. **Feature Branches**: Always create feature branches for new work
2. **Small Commits**: Make frequent, small commits with clear messages
3. **Local Testing**: Optional but recommended for major changes
4. **Merge to Main**: Only merge tested, complete features

### Code Organization
```
richie-games-collection/
├── www/                    # Your game content
│   ├── sudoku/            # Individual games
│   ├── breakout/
│   └── ...
├── scripts/               # Deployment scripts
├── docker/                # Docker configuration
├── .github/workflows/     # CI/CD workflows
└── docs/                  # Documentation
```

### Environment Management
- **`.env.local`**: MacBook development settings
- **`.env`**: Linux server production settings
- **`env.example`**: Template with all available options

## 🧪 Testing Strategies

### Local Testing (MacBook)
```bash
# Quick local test (ARM64 build)
docker-compose up -d
open http://localhost:11888
docker-compose down

# Note: This tests functionality but not production deployment
```

### Staging Testing (Linux Server)
```bash
# SSH to server and test manually
ssh rheiger@your-server.com
cd /home/rheiger/DevOps/minis
./scripts/health-check.sh --verbose
```

### Production Testing (Automatic)
The CI/CD pipeline automatically:
- Tests Docker builds
- Validates configurations
- Checks health endpoints
- Verifies container startup
- Tests actual HTTP responses

## 🔀 Git Workflow Examples

### Simple Feature Development
```bash
# On MacBook
git checkout main
git pull origin main
git checkout -b fix/sudoku-scoring

# Make changes to www/sudoku/game.js
# Test locally if needed

git add www/sudoku/game.js
git commit -m "fix: Correct scoring calculation in Sudoku"
git push origin fix/sudoku-scoring

# Create pull request on GitHub (optional)
# Or merge directly:
git checkout main
git merge fix/sudoku-scoring
git push origin main
# 🚀 Auto-deploys to Linux server
```

### Hotfix Workflow
```bash
# Critical bug fix needed immediately
git checkout main
git checkout -b hotfix/critical-security-fix

# Make minimal changes
git add .
git commit -m "security: Fix XSS vulnerability"
git push origin hotfix/critical-security-fix

# Emergency merge and deploy
git checkout main
git merge hotfix/critical-security-fix
git push origin main
# 🚀 Deploys immediately
```

### Feature Flag Pattern
```javascript
// In your game code, use environment-based features
const FEATURE_FLAGS = {
    newGameMode: process.env.ENABLE_NEW_GAME_MODE === 'true',
    betaFeatures: process.env.ENABLE_BETA_FEATURES === 'true'
};

if (FEATURE_FLAGS.newGameMode) {
    // New feature code
}
```

## 🚨 Emergency Procedures

### Rollback from MacBook
```bash
# Trigger rollback via GitHub Actions
# Go to: https://github.com/your-username/richie-games-collection
# Actions → Deploy to Internal System → Run workflow → Rollback

# Or SSH to server for manual rollback
ssh rheiger@your-server.com
cd /home/rheiger/DevOps/minis
./scripts/rollback.sh --list
./scripts/rollback.sh --yes
```

### Debug Deployment Issues
```bash
# Check deployment logs from MacBook
ssh rheiger@your-server.com "cd /home/rheiger/DevOps/minis && tail -50 webhook-deploy.log"

# Or check via GitHub Actions logs
# GitHub → Actions → Latest workflow run → View logs
```

## 🔧 Platform-Specific Considerations

### Docker Multi-Platform Builds (Advanced)
If you want to test locally with x86 images:

```yaml
# Add to docker-compose.yml for development
services:
  games-web-1:
    build:
      context: .
      dockerfile: Dockerfile
      platforms:
        - linux/amd64  # Force x86 build
        - linux/arm64  # ARM for MacBook
```

### Local Development with Traefik (Optional)
```bash
# Run Traefik locally for full testing
docker network create traefik_public
docker run -d \
  --name traefik-local \
  --network traefik_public \
  -p 80:80 -p 443:443 -p 8080:8080 \
  traefik:v2.10 \
  --api.insecure=true \
  --providers.docker=true
```

## 📊 Monitoring Your Development Workflow

### Track Deployments
```bash
# Check recent deployments
curl -s "https://api.github.com/repos/your-username/richie-games-collection/actions/runs" | \
jq '.workflow_runs[0:5] | .[] | {status: .status, conclusion: .conclusion, created_at: .created_at}'
```

### Monitor Server Health
```bash
# Quick health check from MacBook
ssh rheiger@your-server.com "cd /home/rheiger/DevOps/minis && ./scripts/health-check.sh"

# Or check via curl if webhook is set up
curl -s https://webhook.minis.richie.ch/health | jq .
```

## 🎯 Development Tips

### IDE Setup (VS Code)
```json
// .vscode/settings.json
{
    "files.associations": {
        "*.env*": "env"
    },
    "docker.defaultRegistry": "",
    "docker.imageBuildContextPath": "${workspaceFolder}",
    "remote.SSH.remotePlatform": {
        "your-linux-server.com": "linux"
    }
}
```

### Git Aliases for Speed
```bash
# Add to ~/.gitconfig
[alias]
    deploy = "!git checkout main && git pull origin main && git push origin main"
    feature = "!f() { git checkout main && git pull && git checkout -b feature/$1; }; f"
    hotfix = "!f() { git checkout main && git pull && git checkout -b hotfix/$1; }; f"
```

### Shell Aliases
```bash
# Add to ~/.zshrc or ~/.bashrc on MacBook
alias deploy-games="git checkout main && git pull origin main && git push origin main"
alias check-games="ssh rheiger@your-server.com 'cd /home/rheiger/DevOps/minis && ./scripts/health-check.sh'"
alias logs-games="ssh rheiger@your-server.com 'cd /home/rheiger/DevOps/minis && docker-compose logs -f'"
```

This development workflow gives you the best of both worlds: comfortable development on your MacBook with production-ready deployment to your Linux server! 🚀
