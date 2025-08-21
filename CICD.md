# CI/CD Automation Documentation

## 🚀 Overview

This document describes the CI/CD automation setup for the containerized game collection. Multiple deployment approaches are available:

1. **GitHub Actions with Self-Hosted Runner** (Recommended)
2. **Webhook-based Deployment** (Simple)
3. **Manual Deployment** (Fallback)

## 📋 Prerequisites

- **Internal System Requirements:**
  - Ubuntu/Debian-based Linux distribution
  - Docker and Docker Compose installed
  - Git repository access
  - Internet connectivity for pulling updates

- **GitHub Repository:**
  - Repository with main branch for production deployments
  - Admin access for configuring webhooks and runners

## 🎯 Approach 1: GitHub Actions (Recommended)

### Architecture
- **Self-hosted runner** on your internal system
- **Automated testing** before deployment
- **Health checks** after deployment
- **Rollback capabilities** on failure
- **Slack notifications** (optional)

### Setup Process

#### 1. Prepare Internal System
```bash
# Clone repository to your internal system
cd /home/rheiger/DevOps/
git clone https://github.com/rheiger/richie-games-collection.git minis
cd minis

# Run CI/CD setup script
./scripts/setup-cicd.sh --runner
```

#### 2. Configure GitHub Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `DEPLOY_HOST`: Your internal system IP/hostname
- `DEPLOY_USER`: SSH user (e.g., `rheiger`)
- `DEPLOY_PATH`: Deployment path (e.g., `/home/rheiger/DevOps/minis`)
- `SSH_PRIVATE_KEY`: SSH private key for deployment
- `SLACK_WEBHOOK_URL`: Slack webhook for notifications (optional)

#### 3. Generate SSH Key Pair
```bash
# On your local machine
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""

# Copy public key to internal system
ssh-copy-id -i ~/.ssh/deploy_key.pub user@your-internal-system

# Add private key to GitHub secrets as SSH_PRIVATE_KEY
cat ~/.ssh/deploy_key
```

#### 4. Configure GitHub Runner
```bash
# On internal system
cd /opt/actions-runner

# Get configuration token from GitHub
# Repository → Settings → Actions → Runners → New self-hosted runner
./config.sh --url https://github.com/USERNAME/REPO --token YOUR_TOKEN

# Install as service
sudo ./svc.sh install
sudo ./svc.sh start
```

### Workflow Features
- **Automated testing** on every push to main
- **Docker build validation**
- **Health endpoint checks**
- **Log analysis** for errors
- **Automatic deployment** on successful tests
- **Rollback** on deployment failure
- **Notifications** via Slack

### Manual Trigger
You can manually trigger deployments or rollbacks:
- Go to GitHub → Actions → Deploy to Internal System → Run workflow

## 🎯 Approach 2: Webhook-based Deployment

### Architecture
- **Python webhook server** listening for GitHub webhooks
- **Automatic deployment** on push to main branch
- **Background deployment** with logging
- **Nginx proxy** with SSL termination
- **Rate limiting** and security features

### Setup Process

#### 1. Setup Webhook Server
```bash
# Run setup script
./scripts/setup-cicd.sh --webhook

# Start webhook service
sudo systemctl start webhook-deploy
sudo systemctl status webhook-deploy
```

#### 2. Configure GitHub Webhook
1. Go to GitHub Repository → Settings → Webhooks
2. Click "Add webhook"
3. Configure:
   - **Payload URL**: `https://webhook.games.example.com/webhook`
   - **Content type**: `application/json`
   - **Secret**: Use the generated secret from setup
   - **Events**: Just the push event
4. Click "Add webhook"

#### 3. Test Webhook
```bash
# Check webhook status
curl https://webhook.games.example.com/status

# Test deployment (will trigger on next push to main)
git commit --allow-empty -m "Test webhook deployment"
git push origin main
```

### Webhook Features
- **Signature verification** for security
- **Branch filtering** (only main branch)
- **Background deployment** with timeout
- **Comprehensive logging**
- **Status page** with recent activity
- **Health check endpoint**

## 🎯 Approach 3: Manual Deployment (Fallback)

### Simple Manual Process
```bash
# On internal system
cd /home/rheiger/DevOps/minis
git pull origin main
./scripts/deploy.sh
```

### Interactive Deployment
```bash
# Interactive deployment with prompts
./scripts/deploy.sh

# Automated deployment (CI/CD mode)
./scripts/deploy.sh --automated

# Force deployment even if health checks fail
./scripts/deploy.sh --force --automated
```

## 🔧 Deployment Scripts

### Main Scripts
- **`scripts/deploy.sh`**: Main deployment script
- **`scripts/health-check.sh`**: Comprehensive health checks
- **`scripts/rollback.sh`**: Emergency rollback system
- **`scripts/webhook-deploy.py`**: Webhook server
- **`scripts/setup-cicd.sh`**: CI/CD infrastructure setup
- **`scripts/monitor-cicd.sh`**: Status monitoring

### Deploy Script Features
- **Pre-deployment checks** (Docker, config validation)
- **Automatic backups** before deployment
- **Blue-green deployment** pattern
- **Health checks** with retry logic
- **Automatic rollback** on failure
- **Post-deployment verification**

### Health Check Features
- **Container status** verification
- **Port accessibility** testing
- **HTTP endpoint** checks
- **Log analysis** for errors
- **Resource usage** monitoring
- **Traefik connectivity** verification

### Rollback Features
- **Automatic backups** (5 generations)
- **Configuration restoration**
- **Container state recovery**
- **Health verification** after rollback
- **Emergency recovery** procedures

## 🔍 Monitoring and Troubleshooting

### Status Monitoring
```bash
# Check overall CI/CD status
./scripts/monitor-cicd.sh

# Check application health
./scripts/health-check.sh --verbose

# Check deployment logs
tail -f webhook-deploy.log

# Check container logs
docker-compose logs -f
```

### Common Issues

#### GitHub Actions Runner Not Working
```bash
# Check runner status
sudo systemctl status actions.runner.*

# Restart runner
cd /opt/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh start

# Check runner logs
journalctl -u actions.runner.* -f
```

#### Webhook Not Receiving Events
```bash
# Check webhook service
sudo systemctl status webhook-deploy

# Check nginx proxy
sudo nginx -t
sudo systemctl status nginx

# Check firewall
sudo ufw status
```

#### Deployment Failing
```bash
# Check deployment logs
tail -50 webhook-deploy.log

# Manual health check
./scripts/health-check.sh --verbose

# Check container status
docker-compose ps
docker-compose logs --tail=50
```

#### Network Issues
```bash
# Check Traefik network
docker network ls | grep traefik
docker network inspect traefik_public

# Check container connectivity
docker exec -it minis-web-1 ping traefik
```

### Emergency Procedures

#### Emergency Rollback
```bash
# List available backups
./scripts/rollback.sh --list

# Rollback to latest backup
./scripts/rollback.sh --yes

# Rollback to specific backup
./scripts/rollback.sh --to=backup_20250806_143000 --yes
```

#### Manual Recovery
```bash
# Stop all containers
docker-compose down

# Clean up
docker system prune -f

# Restore from backup
cp backups/backup_LATEST/.env .
docker-compose up -d --build

# Force rebuild if needed
docker-compose build --no-cache
docker-compose up -d
```

## 🔒 Security Considerations

### SSH Security
- Use **ED25519 keys** for SSH authentication
- **Restrict SSH key access** to deployment user only
- **Regular key rotation** (quarterly recommended)

### Webhook Security
- **HMAC signature verification** for all webhook requests
- **Rate limiting** to prevent abuse
- **Firewall rules** restricting access
- **Fail2ban** for intrusion prevention

### Container Security
- **Non-root user** in containers
- **Read-only filesystems** where possible
- **Resource limits** to prevent resource exhaustion
- **Security headers** in nginx configuration

### Network Security
- **Internal Docker networks** for container communication
- **Traefik proxy** for SSL termination
- **Firewall configuration** with minimal open ports

## 📊 Performance Optimization

### Deployment Speed
- **Parallel builds** in GitHub Actions
- **Docker layer caching** for faster builds
- **Incremental deployments** when possible

### Resource Management
- **CPU/Memory limits** configurable per environment
- **Log rotation** to prevent disk space issues
- **Cleanup routines** for old Docker images

### Monitoring
- **Health check intervals** optimized for quick detection
- **Resource usage monitoring** with alerts
- **Performance metrics** collection

## 📝 Configuration Files

### Environment Variables (.env)
All CI/CD behavior can be configured via environment variables:
```env
# CI/CD Settings
DEPLOY_TIMEOUT=300
HEALTH_CHECK_RETRIES=30
BACKUP_RETENTION=5
WEBHOOK_SECRET=your-webhook-secret

# Notification Settings
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
NOTIFICATION_ENABLED=true

# Security Settings
SSH_KEY_PATH=/path/to/ssh/key
WEBHOOK_PORT=8080
WEBHOOK_HOST=0.0.0.0
```

### GitHub Actions Configuration
The workflow is defined in `.github/workflows/deploy.yml` with:
- **Test job**: Build validation and testing
- **Deploy job**: Automated deployment to internal system
- **Rollback job**: Manual rollback capability

### Webhook Configuration
Python-based webhook server with:
- **GitHub signature verification**
- **Event filtering** (push to main only)
- **Background deployment** with logging
- **Status and health endpoints**

## 🚀 Getting Started Checklist

### Prerequisites
- [ ] Internal Linux system with Docker
- [ ] GitHub repository with admin access
- [ ] SSH access to internal system
- [ ] Domain name for webhook (if using approach 2)

### GitHub Actions Setup
- [ ] Run `./scripts/setup-cicd.sh --runner` on internal system
- [ ] Generate SSH key pair
- [ ] Configure GitHub secrets
- [ ] Configure GitHub Actions runner
- [ ] Test deployment workflow

### Webhook Setup
- [ ] Run `./scripts/setup-cicd.sh --webhook` on internal system
- [ ] Configure domain name and SSL certificates
- [ ] Configure GitHub webhook
- [ ] Test webhook deployment

### Verification
- [ ] Push a commit to main branch
- [ ] Verify automatic deployment
- [ ] Test rollback procedure
- [ ] Set up monitoring
- [ ] Configure alerts/notifications

## 📞 Support and Maintenance

### Regular Maintenance
- **Weekly**: Check deployment logs and system resources
- **Monthly**: Update runner and webhook dependencies
- **Quarterly**: Rotate SSH keys and secrets
- **Annually**: Review and update security configurations

### Backup Strategy
- **Automatic backups** before each deployment
- **Manual backup** before major changes
- **Offsite backup** of critical configurations
- **Restore testing** quarterly

### Updates and Patches
- **GitHub Actions runner**: Auto-updates enabled
- **Webhook dependencies**: Monthly security updates
- **System packages**: Automatic security updates enabled
- **Docker images**: Latest stable versions

This CI/CD setup provides robust, automated deployment capabilities while maintaining security and reliability for your internal system.
