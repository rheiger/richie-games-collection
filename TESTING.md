# Testing Guide
## Multi-Domain and Direct Container Access

This guide explains how to test your application using the enhanced domain configuration that supports multiple domains and direct container access.

## 🌐 **Domain Configuration Overview**

### **Production Domains (Load Balanced)**
All these domains will serve the same content and automatically load balance between both containers:

- **Primary Domain**: `https://games.example.com`
- **Alias 1**: `https://play.example.com`
- **Alias 2**: `https://www.play.example.com`

### **Test Domains (Direct Container Access)**
These domains bypass load balancing and route directly to specific containers:

- **Container 1**: `https://test1.games.example.com` → Direct access to `games-web-1`
- **Container 2**: `https://test2.games.example.com` → Direct access to `games-web-2`

## 🧪 **Testing Scenarios**

### **1. Load Balancing Testing**

Test that all production domains properly distribute traffic:

```bash
# Test primary domain
curl -I https://games.example.com

# Test alias domains
curl -I https://play.example.com
curl -I https://www.play.example.com

# Check that they all return the same content
curl -s https://games.example.com | head -5
curl -s https://play.example.com | head -5
curl -s https://www.play.example.com | head -5
```

### **2. Individual Container Testing**

Test each container directly to verify they're working independently:

```bash
# Test container 1 directly
curl -I https://test1.games.example.com
curl -s https://test1.games.example.com | grep "container=web-1"

# Test container 2 directly
curl -I https://test2.games.example.com
curl -s https://test2.games.example.com | grep "container=web-2"
```

### **3. Staged Testing with Different Content**

Use the test domains to deploy different content to each container:

```bash
# 1. Set container 1 to serve www (production)
# 2. Set container 2 to serve www-red (testing)
# 3. Test both versions simultaneously

# Production content (load balanced)
curl -s https://games.example.com | grep "version"

# Test content (container 2 only)
curl -s https://test2.games.example.com | grep "version"
```

## 🔧 **Configuration Examples**

### **Environment Variables**

```bash
# .env file configuration
DOMAIN=games.example.com
DOMAIN_ALIAS_1=play.example.com
DOMAIN_ALIAS_2=www.play.example.com
TEST_DOMAIN_1=test1.games.example.com
TEST_DOMAIN_2=test2.games.example.com
```

### **Content Distribution Scenarios**

#### **Scenario 1: Production Deployment**
```bash
CONTENT_DIR_1=www      # Production content
CONTENT_DIR_2=www      # Production content (backup)
```
- All domains serve identical content
- Load balancing works normally
- High availability during maintenance

#### **Scenario 2: Staged Testing**
```bash
CONTENT_DIR_1=www      # Production content
CONTENT_DIR_2=www-red  # New features for testing
```
- Production domains: `games.example.com`, `play.example.com` → Load balanced production content
- Test domain: `test2.games.example.com` → New features only
- Test domain: `test1.games.example.com` → Production content only

#### **Scenario 3: Full Testing**
```bash
CONTENT_DIR_1=www-red  # New features
CONTENT_DIR_2=www-red  # New features
```
- All domains serve new content
- Full testing of new features
- Easy rollback by changing back to `www`

## 🚀 **Testing Commands**

### **Quick Health Check**
```bash
# Check all domains are responding
for domain in "games.example.com" "play.example.com" "www.play.example.com" "test1.games.example.com" "test2.games.example.com"; do
    echo "Testing $domain..."
    curl -s -o /dev/null -w "%{http_code} - $domain\n" "https://$domain"
done
```

### **Load Balancing Verification**
```bash
# Test that load balancing is working
for i in {1..10}; do
    echo "Request $i:"
    curl -s "https://games.example.com/health" | grep "container="
    sleep 1
done
```

### **Content Comparison**
```bash
# Compare content between containers
echo "Container 1 content:"
curl -s "https://test1.games.example.com/" | grep -E "(title|version|container)" | head -3

echo "Container 2 content:"
curl -s "https://test2.games.example.com/" | grep -E "(title|version|container)" | head -3
```

## 🔍 **Debugging and Troubleshooting**

### **Check Traefik Configuration**
```bash
# Verify all routes are properly configured
docker exec traefik traefik version
docker exec traefik traefik healthcheck

# Check Traefik dashboard (if enabled)
# Usually available at http://your-server:8080
```

### **Container Logs**
```bash
# Check container 1 logs
docker logs minis-web-1 --tail=20

# Check container 2 logs
docker logs minis-web-2 --tail=20

# Check Nginx logs
tail -f logs/web-1/access.log
tail -f logs/web-2/access.log
```

### **DNS Resolution**
```bash
# Verify DNS resolution for all domains
nslookup games.example.com
nslookup play.example.com
nslookup www.play.example.com
nslookup test1.games.example.com
nslookup test2.games.example.com
```

### **SSL Certificate Verification**
```bash
# Check SSL certificates for all domains
openssl s_client -connect games.example.com:443 -servername games.example.com < /dev/null
openssl s_client -connect play.example.com:443 -servername play.example.com < /dev/null
openssl s_client -connect test1.games.example.com:443 -servername test1.games.example.com < /dev/null
```

## 📊 **Monitoring and Metrics**

### **Response Time Monitoring**
```bash
# Monitor response times for all domains
for domain in "games.example.com" "play.example.com" "test1.games.example.com" "test2.games.example.com"; do
    echo "Testing $domain response time..."
    curl -w "@curl-format.txt" -s -o /dev/null "https://$domain"
done
```

Create `curl-format.txt`:
```
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

### **Load Testing**
```bash
# Simple load test with Apache Bench
ab -n 100 -c 10 https://games.example.com/
ab -n 100 -c 10 https://test1.games.example.com/
ab -n 100 -c 10 https://test2.games.example.com/
```

## 🎯 **Best Practices**

### **Testing Workflow**
1. **Always test on test domains first** before deploying to production
2. **Use staged testing** to gradually roll out new features
3. **Monitor response times** across all domains
4. **Verify load balancing** is working correctly
5. **Test rollback procedures** regularly

### **Content Management**
1. **Keep www-red updated** with latest test features
2. **Use git tags** to mark stable versions
3. **Document content differences** between www and www-red
4. **Test content switching** without downtime

### **Monitoring**
1. **Set up alerts** for domain availability
2. **Monitor SSL certificate expiration**
3. **Track response times** across all domains
4. **Log container-specific metrics**

## 🚨 **Common Issues and Solutions**

### **Domain Not Responding**
```bash
# Check if container is running
docker ps | grep minis

# Check Traefik labels
docker inspect minis-web-1 | grep -A 20 "Labels"

# Verify network connectivity
docker exec minis-web-1 ping traefik
```

### **SSL Certificate Issues**
```bash
# Check certificate resolver
docker exec traefik traefik version

# Verify domain configuration
docker exec traefik cat /etc/traefik/traefik.yml
```

### **Load Balancing Not Working**
```bash
# Check service definitions
docker exec traefik traefik healthcheck

# Verify both containers are healthy
curl -s https://test1.games.example.com/health
curl -s https://test2.games.example.com/health
```

This testing setup gives you complete control over your deployment and testing strategy! 🎮✨
