# Container Debugging Guide

This document provides information about debugging tools and techniques available in the containerized game collection.

## 🛠️ Available Debugging Tools

The containers include the following debugging and diagnostic tools:

### Shell & Text Editing
- **bash** - Enhanced shell with scripting capabilities
- **vim** - Text editor for configuration changes
- **less** - File pager for viewing logs and files

### Network Diagnostics
- **iproute2** - Modern network configuration (`ip` command)
- **tcpdump** - Network packet analyzer
- **net-tools** - Classic network tools (`netstat`, `ifconfig`)
- **curl** - HTTP client for testing endpoints
- **wget** - File downloader and HTTP testing

## 🔍 Common Debugging Commands

### Container Access
```bash
# Access running container with bash shell
docker-compose exec games-web-1 bash
docker-compose exec games-web-2 bash

# Run one-off debugging container
docker run --rm -it sudoku-games-web-1:latest bash
```

### Network Debugging
```bash
# Check container networking
docker-compose exec games-web-1 ip addr show
docker-compose exec games-web-1 ip route show

# Test internal connectivity
docker-compose exec games-web-1 curl -I http://localhost/health
docker-compose exec games-web-1 wget -O- http://localhost/health

# Monitor network traffic
docker-compose exec games-web-1 tcpdump -i eth0 -n

# Check listening ports
docker-compose exec games-web-1 netstat -tlnp
```

### Process Monitoring
```bash
# Check nginx processes
docker-compose exec games-web-1 ps aux | grep nginx

# Monitor nginx logs in real-time
docker-compose exec games-web-1 tail -f /var/log/nginx/access.log
docker-compose exec games-web-1 tail -f /var/log/nginx/error.log
```

### File System Inspection
```bash
# Check mounted volumes
docker-compose exec games-web-1 ls -la /usr/share/nginx/html/
docker-compose exec games-web-1 ls -la /var/log/nginx/

# View nginx configuration
docker-compose exec games-web-1 less /etc/nginx/nginx.conf

# Check file permissions
docker-compose exec games-web-1 find /usr/share/nginx/html -type f -exec ls -l {} \;
```

### Health Check Testing
```bash
# Manual health check
docker-compose exec games-web-1 /usr/local/bin/health-check.sh

# Test health endpoint
docker-compose exec games-web-1 curl -v http://localhost/health

# Check Docker health status
docker inspect games-web-1 | grep -A 10 "Health"
```

## 📊 Monitoring and Logs

### Container Logs
```bash
# View all logs
docker-compose logs -f

# View specific container logs
docker-compose logs -f games-web-1
docker-compose logs -f games-web-2

# View logs with timestamps
docker-compose logs -f --timestamps
```

### Nginx Access Logs
```bash
# Real-time access monitoring
docker-compose exec games-web-1 tail -f /var/log/nginx/access.log

# Parse access logs for common patterns
docker-compose exec games-web-1 bash -c "grep 'GET /' /var/log/nginx/access.log | tail -10"

# Monitor error logs
docker-compose exec games-web-1 tail -f /var/log/nginx/error.log
```

### Resource Monitoring
```bash
# Container resource usage
docker stats

# Detailed container information
docker inspect games-web-1

# System resource usage inside container
docker-compose exec games-web-1 bash -c "top -n 1"
docker-compose exec games-web-1 bash -c "df -h"
docker-compose exec games-web-1 bash -c "free -m"
```

## 🔧 Configuration Testing

### Nginx Configuration
```bash
# Test nginx configuration syntax
docker-compose exec games-web-1 nginx -t

# Reload nginx configuration
docker-compose exec games-web-1 nginx -s reload

# View active nginx configuration
docker-compose exec games-web-1 nginx -T
```

### Environment Variables
```bash
# View container environment
docker-compose exec games-web-1 env | grep -E "(NGINX|RATE|LOG)"

# Check specific variables
docker-compose exec games-web-1 bash -c 'echo "Worker processes: $NGINX_WORKER_PROCESSES"'
```

## 🚨 Troubleshooting Common Issues

### Container Won't Start
```bash
# Check container exit status
docker-compose ps

# View startup logs
docker-compose logs games-web-1

# Test configuration
docker-compose config --quiet
```

### Network Connectivity Issues
```bash
# Check if containers can reach each other
docker-compose exec games-web-1 ping games-web-2

# Verify Traefik network connectivity
docker-compose exec games-web-1 ip route show
docker-compose exec games-web-1 ping traefik

# Test external connectivity
docker-compose exec games-web-1 wget -O- https://httpbin.org/ip
```

### Performance Issues
```bash
# Monitor request processing
docker-compose exec games-web-1 bash -c "while true; do echo '--- $(date) ---'; netstat -an | grep :80; sleep 5; done"

# Check for rate limiting
docker-compose exec games-web-1 grep "limiting requests" /var/log/nginx/error.log

# Monitor memory usage
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Log Rotation Issues
```bash
# Check logrotate configuration
docker-compose exec games-web-1 cat /etc/logrotate.d/nginx

# Test logrotate manually
docker-compose exec games-web-1 logrotate -d /etc/logrotate.d/nginx

# Check cron jobs
docker-compose exec games-web-1 crontab -l
```

## 🔒 Security Testing

### Rate Limiting
```bash
# Test rate limiting (be careful not to DoS yourself)
for i in {1..25}; do curl -I https://games.example.com/ && sleep 0.1; done

# Check rate limit logs
docker-compose exec games-web-1 grep "limiting requests" /var/log/nginx/error.log
```

### Security Headers
```bash
# Check security headers
curl -I https://games.example.com/

# Test with specific user agents
curl -H "User-Agent: BadBot/1.0" -I https://games.example.com/robots.txt
```

## 📝 Useful Debugging Scripts

### Quick Health Check Script
Create a file `debug-health.sh`:
```bash
#!/bin/bash
echo "=== Container Status ==="
docker-compose ps

echo -e "\n=== Health Checks ==="
docker-compose exec games-web-1 /usr/local/bin/health-check.sh
docker-compose exec games-web-2 /usr/local/bin/health-check.sh

echo -e "\n=== Recent Access Logs ==="
docker-compose exec games-web-1 tail -5 /var/log/nginx/access.log

echo -e "\n=== Recent Error Logs ==="
docker-compose exec games-web-1 tail -5 /var/log/nginx/error.log
```

### Network Diagnostic Script
Create a file `debug-network.sh`:
```bash
#!/bin/bash
echo "=== Network Configuration ==="
docker-compose exec games-web-1 ip addr show

echo -e "\n=== Routing Table ==="
docker-compose exec games-web-1 ip route show

echo -e "\n=== Listening Ports ==="
docker-compose exec games-web-1 netstat -tlnp

echo -e "\n=== DNS Resolution ==="
docker-compose exec games-web-1 nslookup google.com
```

## 💡 Tips

1. **Always check logs first** when troubleshooting issues
2. **Use health endpoints** to verify service availability
3. **Monitor resource usage** to identify performance bottlenecks
4. **Test configuration changes** in development before production
5. **Keep debugging tools updated** by rebuilding containers periodically
6. **Use proper log levels** to balance between debugging info and log size

## 🆘 Emergency Commands

If containers are completely unresponsive:
```bash
# Force restart all services
docker-compose down && docker-compose up -d

# Rebuild everything from scratch
docker-compose down
docker system prune -f
docker-compose build --no-cache
docker-compose up -d

# Emergency shell access (if container is running but networking is broken)
docker exec -it games-web-1 /bin/bash
```
