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

# Create logrotate configuration from template
cat > /etc/logrotate.d/nginx << EOF
/var/log/nginx/*.log {
    size ${LOG_ROTATE_SIZE:-10M}
    rotate ${LOG_ROTATE_COUNT:-20}
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

# Set up daily logrotate via cron
echo "0 */6 * * * /usr/sbin/logrotate /etc/logrotate.d/nginx" > /tmp/logrotate-cron
crontab -u root /tmp/logrotate-cron
rm /tmp/logrotate-cron

# Start crond for logrotate
crond -b

echo "Container setup completed successfully"
