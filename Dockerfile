# Use nginx alpine for small size and security
FROM nginx:1.25-alpine

# Install logrotate for log management and debugging tools
RUN apk add --no-cache \
    logrotate \
    dcron \
    bash \
    iproute2 \
    tcpdump \
    less \
    vim \
    curl \
    wget \
    net-tools

# Create nginx user directories
RUN mkdir -p /var/log/nginx /var/cache/nginx /var/run/nginx

# Create logrotate configuration for nginx
COPY docker/logrotate.conf /etc/logrotate.d/nginx

# Copy custom nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy robots.txt to be served from root
COPY docker/robots.txt /usr/share/nginx/html/robots.txt

# Create health check script
COPY docker/health-check.sh /usr/local/bin/health-check.sh
RUN chmod +x /usr/local/bin/health-check.sh

# Create startup script that handles logrotate setup
COPY docker/entrypoint.sh /docker-entrypoint.d/01-setup-logs.sh
RUN chmod +x /docker-entrypoint.d/01-setup-logs.sh

# Set proper permissions
RUN chown -R nginx:nginx /var/log/nginx /var/cache/nginx /var/run/nginx /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD /usr/local/bin/health-check.sh

# Expose port for internal communication
EXPOSE 80

# Use nginx user for security
USER nginx

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
