# Richie's Game Collection - Containerized Deployment

This repository contains a collection of browser-based games containerized for high-availability deployment with Docker Compose, nginx load balancing, and Traefik integration.

## 🎮 Games Included

- **Sudoku** - Classic number puzzle
- **Connect Four** - Strategic dropping game
- **Mastermind** - Code-breaking challenge
- **15 Puzzle** - Sliding number tiles
- **Towers of Hanoi** - Classic recursive puzzle
- **Squash** - Ball bouncing game
- **Breakout** - Brick breaking arcade game
- **Conway's Game of Life** - Cellular automaton simulation

## 🏗️ Architecture

- **Two nginx containers** for high availability and load balancing
- **Traefik integration** for automatic SSL termination and ingress
- **Single network design** - simplified networking via traefik_public only
- **Configurable content directories** (www/www-red) for staged deployments
- **Log rotation** and monitoring
- **Rate limiting** and security features
- **Resource limits** for optimal resource usage

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Traefik running on the `traefik_public` network
- DNS record pointing `minis.richie.ch` to your server

### Initial Setup

1. **Clone and configure:**
   ```bash
   cd /path/to/project
   cp env.example .env
   # Edit .env as needed
   ```

2. **Build and start containers:**
   ```bash
   docker-compose up -d --build
   ```

3. **Verify deployment:**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

4. **Access the games:**
   - Production: https://minis.richie.ch
   - Health check: https://minis.richie.ch/health

## ⚙️ Configuration

### Environment Variables

All configuration is managed through the `.env` file. See `env.example` for all available options.

#### Key Settings:

**Content Management:**
```bash
CONTENT_DIR_1=www        # Container 1 content source
CONTENT_DIR_2=www        # Container 2 content source
```

**Load Balancing Scenarios:**
```bash
# Both containers serve production
CONTENT_DIR_1=www
CONTENT_DIR_2=www

# One container tests new features
CONTENT_DIR_1=www
CONTENT_DIR_2=www-red

# Both test (for major changes)
CONTENT_DIR_1=www-red
CONTENT_DIR_2=www-red
```

**Resource Limits:**
```bash
CPU_LIMIT=0.5            # Max CPU per container
MEMORY_LIMIT=256M        # Max memory per container
```

**Security:**
```bash
RATE_LIMIT_REQUESTS=10r/s # Requests per second
RATE_LIMIT_BURST=20      # Burst capacity
```

**Logging:**
```bash
LOG_ROTATE_SIZE=10M      # Rotate when logs reach size
LOG_ROTATE_COUNT=20      # Keep this many old logs
```

### Directory Structure

```
.
├── docker-compose.yml          # Container orchestration
├── Dockerfile                  # Container definition
├── .env                        # Configuration (create from env.example)
├── env.example                 # Configuration template
├── .gitignore                  # Git ignore rules
├── .dockerignore               # Docker build context excludes
├── deploy.sh                   # Deployment automation script
├── README.md                   # This documentation
├── DEBUGGING.md                # Container debugging guide
├── docker/                     # Docker configuration files
│   ├── nginx.conf              # Nginx configuration
│   ├── robots.txt              # SEO and security
│   ├── health-check.sh         # Health monitoring
│   ├── entrypoint.sh           # Container initialization
│   └── logrotate.conf          # Log rotation config
├── logs/                       # Log files (created automatically)
│   ├── web-1/                  # Container 1 logs
│   └── web-2/                  # Container 2 logs
├── www/                        # Production game files
└── www-red/                    # Testing/staging game files
```

## 🔧 Operations

### Deployment Commands

```bash
# Start services
docker-compose up -d

# Rebuild and restart
docker-compose up -d --build

# Scale (if needed)
docker-compose up -d --scale games-web-1=1 --scale games-web-2=1

# View logs
docker-compose logs -f
docker-compose logs games-web-1

# Stop services
docker-compose down
```

### Maintenance

#### Rolling Updates
1. Update content in `www` or `www-red`
2. Restart containers one by one:
   ```bash
   docker-compose restart games-web-1
   # Wait for health check, then:
   docker-compose restart games-web-2
   ```

#### Testing New Features
1. Place new content in `www-red/`
2. Update `.env`:
   ```bash
   CONTENT_DIR_2=www-red
   ```
3. Restart container:
   ```bash
   docker-compose restart games-web-2
   ```

#### Log Management
Logs are automatically rotated based on `.env` settings:
- Location: `./logs/web-1/` and `./logs/web-2/`
- Rotation: Every 10MB or weekly (configurable)
- Retention: 20 generations (configurable)

### Monitoring

#### Health Checks
- Built-in Docker health checks
- Nginx health endpoint: `/health`
- Access logs with performance metrics

#### View Status
```bash
# Container health
docker-compose ps

# Resource usage
docker stats

# Logs with timestamps
docker-compose logs -f --timestamps
```

## 🛡️ Security Features

- **Rate limiting**: Configurable requests per second
- **Security headers**: XSS protection, MIME sniffing prevention
- **Robots.txt**: SEO and crawler management
- **Hidden file protection**: Denies access to dotfiles
- **Resource limits**: Prevents resource exhaustion
- **Non-root user**: Containers run as nginx user

## 🌐 Traefik Integration

The setup automatically configures Traefik labels for:
- **SSL termination** with Let's Encrypt
- **Load balancing** across both containers
- **HTTP to HTTPS redirect**
- **Custom domain routing**

### Required Traefik Configuration

Your Traefik instance should have:
- Certificate resolver configured (e.g., `myresolver`, `letsencrypt`)
- `traefik_public` network available
- HTTP and HTTPS entrypoints defined

## 🛠️ Debugging Tools

Each container includes comprehensive debugging tools for troubleshooting:

- **bash** - Enhanced shell with scripting capabilities
- **vim** - Text editor for configuration changes
- **tcpdump** - Network packet analyzer
- **iproute2** (`ip` command) - Modern network diagnostics
- **less** - File pager for viewing logs
- **curl/wget** - HTTP testing utilities
- **net-tools** - Classic network tools

### Container Access
```bash
# Access running container
docker-compose exec games-web-1 bash

# Run debugging commands
docker-compose exec games-web-1 ip addr show
docker-compose exec games-web-1 tcpdump -i eth0 -n
docker-compose exec games-web-1 tail -f /var/log/nginx/access.log
```

See **DEBUGGING.md** for comprehensive debugging guide and commands.

## 🐛 Troubleshooting

### Common Issues

**Containers won't start:**
```bash
# Check logs
docker-compose logs

# Verify network exists
docker network ls | grep traefik_public

# Check file permissions
ls -la docker/
```

**Traefik routing not working:**
```bash
# Verify labels
docker-compose config

# Check Traefik dashboard
# Ensure DNS points to correct server
```

**High resource usage:**
```bash
# Adjust limits in .env
CPU_LIMIT=0.3
MEMORY_LIMIT=128M

# Restart containers
docker-compose up -d
```

**Log rotation issues:**
```bash
# Check log directory permissions
ls -la logs/

# Manually trigger rotation
docker-compose exec games-web-1 logrotate /etc/logrotate.d/nginx
```

## 📊 Performance

Expected performance with default settings:
- **Response time**: < 50ms for static assets
- **Throughput**: > 1000 requests/second
- **Memory usage**: ~64MB per container
- **CPU usage**: < 5% under normal load

## 🔮 Future Enhancements

Planned improvements:
- User authentication system
- Payment integration
- PostgreSQL integration for user data
- Advanced monitoring with Prometheus
- CDN integration for global performance

## 📝 License

This project is part of Richie's Game Collection. All rights reserved.
