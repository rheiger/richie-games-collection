#!/bin/bash

# Setup script for nginx container initialization
# This runs before nginx starts and sets up logging and rotation

echo "Setting up nginx container..."

# Create log directories with proper permissions
mkdir -p /var/log/nginx
chown -R nginx:nginx /var/log/nginx
chmod 755 /var/log/nginx

# Setup logrotate for this container
echo "Configuring log rotation..."

# Create logrotate configuration from template (skip if no write permission)
if [ -w /etc/logrotate.d/ ]; then
    cat > /etc/logrotate.d/nginx << EOF
/var/log/nginx/*.log {
    size 10M
    rotate 20
    missingok
    compress
    delaycompress
    notifempty
    create 644 nginx nginx
    sharedscripts
    postrotate
        if [ -f /var/run/nginx/nginx.pid ]; then
            kill -USR1 \$(cat /var/run/nginx/nginx.pid)
        fi
    endscript
}
EOF
else
    echo "Skipping logrotate configuration (no write permission to /etc/logrotate.d/)"
fi

# Set up logrotate cron job (Note: crond needs root privileges)
echo "0 */6 * * * /usr/sbin/logrotate /etc/logrotate.d/nginx" > /tmp/logrotate-cron
# We'll skip crond setup for now since container runs as nginx user
# In production, you'd want to handle log rotation externally

echo "Container setup completed successfully"
