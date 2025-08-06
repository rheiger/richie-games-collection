#!/bin/bash

# Health check script for nginx container
# Returns 0 if healthy, 1 if unhealthy

# Check if nginx process is running
if ! pgrep -f "nginx: master process" > /dev/null; then
    echo "ERROR: nginx master process not found"
    exit 1
fi

# Check if nginx is responding to requests
if ! wget --quiet --tries=1 --timeout=5 --spider http://localhost/health; then
    echo "ERROR: nginx health endpoint not responding"
    exit 1
fi

# Check if log directory is writable
if ! touch /var/log/nginx/health-check.tmp 2>/dev/null; then
    echo "ERROR: cannot write to log directory"
    exit 1
fi
rm -f /var/log/nginx/health-check.tmp

# All checks passed
echo "OK: nginx is healthy"
exit 0
