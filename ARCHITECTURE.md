# Architecture Overview

This document explains the technical architecture and design decisions for the containerized game collection.

## 🏗️ Container Architecture

### Volume Strategy

The implementation uses **volume mounts** rather than copying content into containers:

```yaml
# Content volumes (read-only mounts)
- ./${CONTENT_DIR_1:-www}:/usr/share/nginx/html:ro
- ./${CONTENT_DIR_2:-www}:/usr/share/nginx/html:ro

# Log volumes (read-write, separated per container)
- ./logs/web-1:/var/log/nginx    # Container 1 logs
- ./logs/web-2:/var/log/nginx    # Container 2 logs

# Configuration volumes (read-only)
- ./docker/nginx.conf:/etc/nginx/nginx.conf:ro
- ./docker/robots.txt:/usr/share/nginx/html/robots.txt:ro
```

### Benefits of Volume Mounting

| Aspect | Volume Mount | Copy Into Container |
|--------|-------------|-------------------|
| **Live Updates** | ✅ Immediate | ❌ Requires rebuild |
| **Storage Efficiency** | ✅ Single copy | ❌ Multiple copies |
| **Development** | ✅ Direct editing | ❌ Copy workflow |
| **Backup** | ✅ Host filesystem | ❌ Container specific |
| **Performance** | ✅ Direct access | ⚠️ Layer overhead |

## 🔄 Load Balancing Strategy

### Traefik Integration

```yaml
# Only Container 1 has Traefik labels to avoid conflicts
labels:
  - "traefik.http.services.minis.loadbalancer.server.port=${INTERNAL_PORT:-11888}"
  - "traefik.http.routers.minis.rule=Host(`${DOMAIN:-minis.richie.ch}`)"
```

- **Single Service Definition**: Traefik sees one service with multiple backends
- **Automatic Discovery**: Both containers automatically join the load balancer
- **Health Checks**: Unhealthy containers are automatically excluded

### Container Distribution Scenarios

#### 1. Production Load Balancing (Default)
```env
CONTENT_DIR_1=www
CONTENT_DIR_2=www
```
Both containers serve identical content for high availability.

#### 2. Staged Testing
```env
CONTENT_DIR_1=www      # Production traffic
CONTENT_DIR_2=www-red  # Limited testing
```
One container tests new features while the other serves production.

#### 3. Full Staging
```env
CONTENT_DIR_1=www-red
CONTENT_DIR_2=www-red
```
Both containers test new features before production deployment.

## 📊 Logging Architecture

### Separated Log Streams

Each container writes to its own log directory to prevent race conditions:

```
logs/
├── web-1/
│   ├── access.log
│   ├── error.log
│   └── access.log.1.gz  # Rotated logs
└── web-2/
    ├── access.log
    ├── error.log
    └── access.log.1.gz
```

### Log Rotation Strategy

**Per-container rotation** with configurable parameters:
- **Size trigger**: `LOG_ROTATE_SIZE=10M` (default)
- **Time trigger**: Weekly (whichever comes first)
- **Retention**: `LOG_ROTATE_COUNT=20` generations
- **Compression**: Gzip for old logs

### Race Condition Prevention

| Issue | Our Solution |
|-------|-------------|
| **File locking** | Separate directories per container |
| **Log corruption** | Independent log rotation per container |
| **Performance** | No shared file handles |
| **Debugging** | Clear container identification in logs |

## 🌐 Network Architecture

### Network Topology

```
Internet
    ↓
[Traefik Ingress]
    ↓
traefik_public network
    ↓
[Load Balancer] ← Container 1 (games-web-1:11888)
                ← Container 2 (games-web-2:11888)
```

### Network Simplification

**Single Network Design**: Only `traefik_public` network is used because:
- ✅ **No Inter-container Communication**: Static content servers don't need to talk to each other
- ✅ **Traefik Handles Load Balancing**: Traffic routing managed externally
- ✅ **Simplified Configuration**: Fewer network components to manage
- ✅ **Security**: All traffic flows through Traefik (controlled entry point)

### Network Security

- **Single External Network**: Only Traefik-accessible
- **No Internal Network**: Unnecessary for static content serving
- **Port Exposure**: Configurable via `INTERNAL_PORT_1` and `INTERNAL_PORT_2`
- **SSL Termination**: Handled by Traefik (not containers)

## 🔒 Security Model

### Container Security

```dockerfile
# Run as non-root user
USER nginx

# Read-only content mounts
volumes:
  - ./www:/usr/share/nginx/html:ro

# Resource limits
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 256M
```

### Network Security

- **Rate Limiting**: nginx-level request throttling
- **Security Headers**: XSS, MIME sniffing protection
- **Hidden Files**: Access denied to dotfiles
- **Robots.txt**: Crawler behavior control

## 🚀 Performance Characteristics

### Expected Performance

| Metric | Value | Notes |
|--------|-------|-------|
| **Response Time** | < 50ms | Static assets |
| **Throughput** | > 1000 rps | Per container |
| **Memory Usage** | ~64MB | Per container |
| **CPU Usage** | < 5% | Normal load |
| **Storage I/O** | Direct host access | No container layers |

### Optimization Features

- **Gzip Compression**: Automatic for text content
- **Static Asset Caching**: 1-year cache for assets
- **HTML Caching**: 1-hour cache for pages
- **Keep-Alive**: Persistent connections
- **Worker Processes**: Auto-scaled to CPU cores

## 🔧 Operational Model

### Deployment Workflow

1. **Content Update**: Modify files in `www/` or `www-red/`
2. **No Restart Needed**: Changes immediately visible
3. **Rolling Updates**: Restart containers one at a time
4. **Health Monitoring**: Automatic unhealthy container exclusion

### Maintenance Operations

```bash
# Rolling restart (zero downtime)
docker-compose restart games-web-1
# Wait for health check, then:
docker-compose restart games-web-2

# Configuration reload
docker-compose exec games-web-1 nginx -s reload
docker-compose exec games-web-2 nginx -s reload

# Log rotation (automatic via cron)
docker-compose exec games-web-1 logrotate /etc/logrotate.d/nginx
```

### Scaling Considerations

**Current Limits:**
- 2 containers (can be increased)
- Single-node deployment
- Shared content directories

**Future Scaling Options:**
- Container replication (`docker-compose scale`)
- Multi-node deployment
- Content distribution networks
- Database-backed sessions

## 🔍 Monitoring & Observability

### Built-in Monitoring

- **Health Endpoints**: `/health` for each container
- **Docker Health Checks**: Built into container definition
- **Access Logs**: Detailed request metrics
- **Error Logs**: Application and nginx errors

### Metrics Available

```bash
# Container metrics
docker stats

# Access patterns
docker-compose exec games-web-1 tail -f /var/log/nginx/access.log

# Performance metrics
docker-compose exec games-web-1 bash -c "grep 'rt=' /var/log/nginx/access.log"
```

### Log Format

Custom nginx log format includes:
- Request time (`rt=`)
- Upstream connect time (`uct=`)
- Container identification (`container=`)
- Standard access log fields

## 📈 Future Architecture Considerations

### Planned Enhancements

1. **Database Integration**
   - PostgreSQL container
   - User session management
   - Game statistics

2. **Enhanced Monitoring**
   - Prometheus metrics
   - Grafana dashboards
   - Alert manager

3. **CDN Integration**
   - Static asset distribution
   - Global performance
   - Cache invalidation

4. **Multi-Environment**
   - Development/Staging/Production
   - Environment-specific configurations
   - Automated deployment pipelines

### Architecture Evolution

The current architecture is designed to support future enhancements:
- **Microservices**: Easy service addition
- **Database**: Network and volume patterns established
- **Scaling**: Load balancer and health check patterns
- **Monitoring**: Logging and metrics foundation
