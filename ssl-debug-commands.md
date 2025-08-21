# SSL Certificate Debugging Commands

## 1. Check Traefik Configuration

```bash
# Check if your cert resolver exists in Traefik config
grep -r "myresolver" /path/to/traefik/config/

# Or check Traefik logs for cert resolver errors
docker logs traefik-container-name | grep -i cert
docker logs traefik-container-name | grep -i acme
```

## 2. Verify Domain & DNS

```bash
# Check DNS resolution
nslookup games.example.com

# Test if domain reaches your server
curl -I http://games.example.com
```

## 3. Certificate Analysis

```bash
# Check current certificate details
openssl s_client -connect games.example.com:443 -servername games.example.com \
  | openssl x509 -noout -text | head -20

# Check certificate issuer (should NOT be self-signed)
echo | openssl s_client -connect games.example.com:443 -servername games.example.com \
  | openssl x509 -noout -issuer
```

## 4. Traefik Dashboard Check

If you have Traefik dashboard enabled:
```bash
# Check services (should show your minis service with 2 backends)
curl http://traefik-dashboard:8080/api/http/services

# Check routers (should show minis router with TLS enabled)
curl http://traefik-dashboard:8080/api/http/routers

# Check certificates (should show your domain certificate)
curl http://traefik-dashboard:8080/api/http/routers/minis@docker
```

## 5. Common SSL Issues & Fixes

### Issue 1: Wrong Cert Resolver Name
**Problem**: `CERT_RESOLVER=myresolver` but Traefik config has different name

**Check**: Look in your Traefik config for:
```yaml
certificatesResolvers:
  myresolver:  # ← This name must match CERT_RESOLVER
    acme:
      email: your@email.com
      storage: acme.json
      httpChallenge:
        entryPoint: web
```

### Issue 2: ACME Challenge Not Reachable
**Problem**: Let's Encrypt can't reach your domain for validation

**Test**:
```bash
# This should reach your server and return Traefik response
curl -v http://games.example.com/.well-known/acme-challenge/test
```

### Issue 3: Wrong Entrypoint Configuration
**Problem**: `websecure` entrypoint not properly configured

**Check Traefik config**:
```yaml
entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"
```

### Issue 4: Domain Not Pointing to Your Server
**Problem**: DNS doesn't resolve to your server IP

**Check**:
```bash
# Should return your server's public IP
dig +short games.example.com
```

## 6. Traefik Container Labels Verification

Check that containers have proper labels:
```bash
# Should show traefik.enable=true and service labels
docker inspect minis-web-1 | grep -A 20 Labels
docker inspect minis-web-2 | grep -A 20 Labels
```

## 7. Forced Certificate Renewal

If certificate seems stuck:
```bash
# Stop Traefik
docker stop traefik-container

# Remove old certificate (BACKUP FIRST!)
# rm /path/to/traefik/acme.json

# Restart Traefik (will request new cert)
docker start traefik-container
```

## 8. Rate Limit Check

Let's Encrypt has rate limits:
```bash
# Check if you've hit rate limits
curl "https://crt.sh/?q=games.example.com&output=json" | jq -r '.[] | .not_before' | sort | tail -10
```
