# Nginx Log Format Reference

## Current Log Format

```
$remote_addr - $remote_user [$time_iso8601] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent" "proxy=$http_x_forwarded_for" rt=$request_time uct="$upstream_connect_time" uht="$upstream_header_time" urt="$upstream_response_time" container=nginx
```

## Example Log Entry

```
203.0.113.195 - - [2025-08-06T14:43:25+02:00] "GET / HTTP/1.1" 200 5319 "-" "TestBrowser/1.0" "proxy=203.0.113.195" rt=0.000 uct="-" uht="-" urt="-" container=nginx
```

## Field Breakdown

| Field | Description | Example |
|-------|-------------|---------|
| **$remote_addr** | Real client IP (processed through real_ip module) | `203.0.113.195` |
| **$remote_user** | HTTP auth user (usually `-`) | `-` |
| **$time_iso8601** | ISO 8601 timestamp with timezone | `[2025-08-06T14:43:25+02:00]` |
| **$request** | HTTP request line | `"GET / HTTP/1.1"` |
| **$status** | HTTP status code | `200` |
| **$body_bytes_sent** | Response size in bytes | `5319` |
| **$http_referer** | HTTP referer header | `"-"` |
| **$http_user_agent** | User agent string | `"TestBrowser/1.0"` |
| **proxy=** | Original forwarded-for chain | `"proxy=203.0.113.195"` |
| **rt=** | Total request time (seconds) | `rt=0.000` |
| **uct=** | Upstream connect time | `uct="-"` |
| **uht=** | Upstream header time | `uht="-"` |
| **urt=** | Upstream response time | `urt="-"` |
| **container=** | Container identifier | `container=nginx` |

## Real IP Configuration

The nginx configuration includes real IP detection to show actual client IPs behind Traefik:

```nginx
set_real_ip_from 172.16.0.0/12;  # Docker internal networks
set_real_ip_from 192.168.0.0/16; # Private networks  
set_real_ip_from 10.0.0.0/8;     # Private networks
real_ip_header X-Forwarded-For;
real_ip_recursive on;
```

## Timezone Configuration

The timestamp timezone is configurable via environment variable:

```env
TIMEZONE=Europe/Zurich    # Default
TIMEZONE=America/New_York # Eastern Time
TIMEZONE=UTC              # Coordinated Universal Time
```

## Log Rotation

Logs are automatically rotated based on configuration:
- **Size trigger**: 10MB (configurable via `LOG_ROTATE_SIZE`)
- **Time trigger**: Weekly
- **Retention**: 20 generations (configurable via `LOG_ROTATE_COUNT`)
- **Compression**: Gzip for old logs

## Log Parsing Examples

### Parse with awk
```bash
# Extract IP, timestamp, and response time
awk '{print $1, $4$5, $NF}' access.log

# Count requests by IP
awk '{print $1}' access.log | sort | uniq -c | sort -nr
```

### Parse with grep
```bash
# Find requests from specific IP
grep "203\.0\.113\.195" access.log

# Find slow requests (>1 second)
grep "rt=[1-9]" access.log

# Find error responses
grep " [45][0-9][0-9] " access.log
```

### Parse with jq (convert to JSON)
```bash
# Convert to JSON for analysis
cat access.log | while read line; do
  echo "$line" | awk '{print "{\"ip\":\""$1"\",\"time\":\""$4$5"\",\"method\":\""$6"\",\"status\":"$9",\"size\":"$10",\"rt\":\""$(NF-4)"\"}"}' 
done | jq .
```