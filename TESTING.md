# Testing Guide
## Multi-Domain and Direct Container Access

This guide explains how to test your application using the enhanced domain configuration that supports multiple domains and direct container access.

## 🌐 **Domain Configuration Overview**

### **Production Domains (Load Balanced)**
All these domains will serve the same content and automatically load balance between both containers:

- **Primary Domain**: `https://minis.richie.ch`
- **Alias 1**: `https://eiger.software`
- **Alias 2**: `https://www.eiger.software`

### **Test Domains (Direct Container Access)**
These domains bypass load balancing and route directly to specific containers:

- **Container 1**: `https://test1.minis.eiger.software` → Direct access to `games-web-1`
- **Container 2**: `https://test2.minis.eiger.software` → Direct access to `games-web-2`

## 🧪 **Testing Scenarios**

### **1. Load Balancing Testing**

Test that all production domains properly distribute traffic:

```bash
# Test primary domain
curl -I https://minis.richie.ch

# Test alias domains
curl -I https://eiger.software
curl -I https://www.eiger.software

# Check that they all return the same content
curl -s https://minis.richie.ch | head -5
curl -s https://eiger.software | head -5
curl -s https://www.eiger.software | head -5
```

### **2. Individual Container Testing**

Test each container directly to verify they're working independently:

```bash
# Test container 1 directly
curl -I https://test1.minis.eiger.software
curl -s https://test1.minis.eiger.software | grep "container=web-1"

# Test container 2 directly
curl -I https://test2.minis.eiger.software
curl -s https://test2.minis.eiger.software | grep "container=web-2"
```

### **3. Staged Testing with Different Content**

Use the test domains to deploy different content to each container:

```bash
# 1. Set container 1 to serve www (production)
# 2. Set container 2 to serve www-red (testing)
# 3. Test both versions simultaneously

# Production content (load balanced)
curl -s https://minis.richie.ch | grep "version"

# Test content (container 2 only)
curl -s https://test2.minis.richie.ch | grep "version"
```

## 🔧 **Configuration Examples**

### **Environment Variables**

```bash
# .env file configuration
DOMAIN=minis.richie.ch
DOMAIN_ALIAS_1=eiger.software
DOMAIN_ALIAS_2=www.eiger.software
TEST_DOMAIN_1=test1.minis.eiger.software
TEST_DOMAIN_2=test2.minis.eiger.software
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
- Production domains: `minis.richie.ch`, `eiger.software` → Load balanced production content
- Test domain: `test2.minis.richie.ch` → New features only
- Test domain: `test1.minis.richie.ch` → Production content only

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
for domain in "minis.richie.ch" "eiger.software" "www.eiger.software" "test1.minis.eiger.software" "test2.minis.eiger.software"; do
    echo "Testing $domain..."
    curl -s -o /dev/null -w "%{http_code} - $domain\n" "https://$domain"
done
```

### **Load Balancing Verification**
```bash
# Test that load balancing is working
for i in {1..10}; do
    echo "Request $i:"
    curl -s "https://minis.richie.ch/health" | grep "container="
    sleep 1
done
```

### **Content Comparison**
```bash
# Compare content between containers
echo "Container 1 content:"
curl -s "https://test1.minis.eiger.software/" | grep -E "(title|version|container)" | head -3

echo "Container 2 content:"
curl -s "https://test2.minis.eiger.software/" | grep -E "(title|version|container)" | head -3
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
nslookup minis.richie.ch
nslookup eiger.software
nslookup www.eiger.software
nslookup test1.minis.eiger.software
nslookup test2.minis.eiger.software
```

### **SSL Certificate Verification**
```bash
# Check SSL certificates for all domains
openssl s_client -connect minis.richie.ch:443 -servername minis.richie.ch < /dev/null
openssl s_client -connect eiger.software:443 -servername eiger.software < /dev/null
openssl s_client -connect test1.minis.eiger.software:443 -servername test1.minis.eiger.software < /dev/null
```

## 📊 **Monitoring and Metrics**

### **Response Time Monitoring**
```bash
# Monitor response times for all domains
for domain in "minis.richie.ch" "eiger.software" "test1.minis.eiger.software" "test2.minis.eiger.software"; do
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
ab -n 100 -c 10 https://minis.richie.ch/
ab -n 100 -c 10 https://test1.minis.eiger.software/
ab -n 100 -c 10 https://test2.minis.eiger.software/
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
curl -s https://test1.minis.eiger.software/health
curl -s https://test2.minis.eiger.software/health
```

This testing setup gives you complete control over your deployment and testing strategy! 🎮✨