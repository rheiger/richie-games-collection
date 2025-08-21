# Multi-Domain Setup Guide
## Domain Aliases and Direct Container Access

This guide explains how to set up and use the enhanced multi-domain capabilities that allow you to serve your application from multiple domains and test individual containers directly.

## 🎯 **What You Get**

### **Production Domains (Load Balanced)**
- **Primary**: `https://games.example.com` - Your main domain
- **Alias 1**: `https://play.example.com` - Additional brand domain
- **Alias 2**: `https://www.play.example.com` - WWW subdomain

All these domains automatically load balance traffic across both containers.

### **Test Domains (Direct Container Access)**
These domains bypass load balancing and route directly to specific containers:

- **Container 1**: `https://test1.games.example.com` → Direct access to `games-web-1`
- **Container 2**: `https://test2.games.example.com` → Direct access to `games-web-2`

## 🚀 **Quick Setup**

### **1. Configure Your Domains**

Edit your `.env` file:

```bash
# Production domains (load balanced)
DOMAIN=games.example.com
DOMAIN_ALIAS_1=play.example.com
DOMAIN_ALIAS_2=www.play.example.com

# Test domains (direct container access)
TEST_DOMAIN_1=test1.games.example.com
TEST_DOMAIN_2=test2.games.example.com
```

### **2. DNS Configuration**

Ensure all domains point to your server:

```bash
# A records for all domains
games.example.com.        IN A YOUR_SERVER_IP
play.example.com.         IN A YOUR_SERVER_IP
www.play.example.com.     IN A YOUR_SERVER_IP
test1.games.example.com.  IN A YOUR_SERVER_IP
test2.games.example.com.  IN A YOUR_SERVER_IP
```

### **3. Deploy and Test**

```bash
# Deploy the updated configuration
docker-compose down
docker-compose up -d

# Test all domains
./scripts/test-domains.sh --verbose --health --load-test
```

## 🧪 **Testing Scenarios**

### **Scenario 1: Production Load Balancing**
```bash
# Both containers serve identical content
CONTENT_DIR_1=www
CONTENT_DIR_2=www

# All production domains load balance:
# - games.example.com
# - play.example.com
# - www.play.example.com
```

**Result**: High availability with automatic failover.

### **Scenario 2: Staged Testing**
```bash
# Production domains: games.example.com, play.example.com → Load balanced production content
# Test domain: test2.games.example.com → New features only
# Test domain: test1.games.example.com → Production content only
```

**Result**: Test new features without affecting production users.

#### **Scenario 3: Full Testing**
```bash
# Both containers test new features
CONTENT_DIR_1=www-red
CONTENT_DIR_2=www-red

# All domains serve new content
# Easy rollback by changing back to www
```

**Result**: Full testing before production deployment.

## 📊 **Monitoring and Testing**

### **Quick Domain Test**
```bash
# Test all domains for basic connectivity
./scripts/test-domains.sh

# Detailed testing with response times
./scripts/test-domains.sh --verbose

# Include health checks
./scripts/test-domains.sh --verbose --health

# Test load balancing
./scripts/test-domains.sh --verbose --health --load-test
```

### **Manual Testing Commands**
```bash
# Test production domains (should load balance)
curl -I https://games.example.com
curl -I https://play.example.com
curl -I https://www.play.example.com

# Test direct container access
curl -s https://test1.games.example.com | grep "container="
curl -s https://test2.games.example.com | grep "container="

# Verify load balancing
for i in {1..10}; do
    curl -s https://games.example.com/health | grep "container="
    sleep 1
done
```

### **Health Monitoring**
```bash
# Check container status
docker ps | grep minis

# Monitor logs
docker-compose logs -f

# Check Traefik configuration
docker exec traefik traefik version
```

## 🚨 **Troubleshooting**

### **Domain Not Responding**
```bash
# 1. Check DNS resolution
nslookup your-domain.com

# 2. Verify container status
docker ps | grep minis

# 3. Check Traefik labels
docker inspect minis-web-1 | grep -A 20 "Labels"

# 4. Verify network connectivity
docker exec minis-web-1 ping traefik
```

### **Load Balancing Not Working**
```bash
# 1. Check both containers are healthy
curl -s https://test1.games.example.com/health
curl -s https://test2.games.example.com/health

# 2. Verify service definition
docker exec traefik traefik healthcheck

# 3. Check container logs
docker logs minis-web-1 --tail=20
docker logs minis-web-2 --tail=20
```

### **SSL Certificate Issues**
```bash
# 1. Check certificate resolver
docker exec traefik traefik version

# 2. Verify domain configuration
docker exec traefik cat /etc/traefik/traefik.yml

# 3. Test SSL connection
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

## 🎮 **Real-World Usage Examples**

### **Development Workflow**
```bash
# 1. Develop new features in www-red
# 2. Deploy with container 2 serving www-red
CONTENT_DIR_1=www      # Production
CONTENT_DIR_2=www-red  # New features

# 3. Test new features at test2.games.example.com
# 4. Production users still get stable content via load balancing
# 5. When ready, switch both containers to www-red
# 6. After testing, switch back to www for production
```

### **A/B Testing**
```bash
# Container 1: Version A
CONTENT_DIR_1=www-version-a

# Container 2: Version B
CONTENT_DIR_2=www-version-b

# Production domains: Load balanced (mix of A and B)
# Test domains: Pure A or B for analysis
```

### **Maintenance Mode**
```bash
# Container 1: Maintenance page
CONTENT_DIR_1=maintenance

# Container 2: Production content
CONTENT_DIR_2=www

# Production domains: Mix of maintenance and production
# Test domains: Pure maintenance or production
```

## 🔒 **Security Considerations**

### **Rate Limiting**
Rate limiting applies to all domains independently:

```bash
# Configure in .env
RATE_LIMIT_REQUESTS=10r/s
RATE_LIMIT_BURST=20
```

### **Access Control**
Consider adding authentication for test domains:

```nginx
# In nginx.conf, add location blocks for test domains
location / {
    # Basic auth for test domains
    if ($host ~* ^test[0-9]+\.) {
        auth_basic "Test Environment";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
```

### **Monitoring**
Monitor all domains for:
- Response times
- Error rates
- SSL certificate expiration
- Container health

## 📈 **Performance Optimization**

### **CDN Integration**
Consider using a CDN for production domains:

```bash
# Configure CDN to point to your load balancer
# CDN → Load Balancer → Your Containers
```

### **Caching Strategy**
Implement caching headers in your content:

```nginx
# In nginx.conf
location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### **Load Testing**
Test your setup under load:

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test load balancing
ab -n 1000 -c 10 https://games.example.com/
ab -n 1000 -c 10 https://play.example.com/
```

## 🎯 **Next Steps**

1. **Configure your domains** in the `.env` file
2. **Set up DNS records** for all domains
3. **Deploy and test** using the provided scripts
4. **Monitor performance** across all domains
5. **Implement your testing strategy** using the direct container access

This multi-domain setup gives you enterprise-grade flexibility for testing, staging, and production deployment! 🚀✨
