#!/usr/bin/env python3
"""
Simple webhook server for automated deployment
Listens for GitHub webhooks and triggers deployment on push to main branch

Usage: python3 webhook-deploy.py [--port 8080] [--secret your-secret]
"""

import json
import hmac
import hashlib
import subprocess
import os
import sys
import logging
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
import time

# Configuration
DEFAULT_PORT = 8080
DEPLOY_SCRIPT = "./scripts/deploy.sh"
LOG_FILE = "webhook-deploy.log"
SECRET = os.environ.get('WEBHOOK_SECRET', '')

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class WebhookHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Override to use our logger
        logger.info(f"{self.address_string()} - {format % args}")
    
    def verify_signature(self, body, signature):
        """Verify GitHub webhook signature"""
        if not SECRET:
            logger.warning("No webhook secret configured - skipping signature verification")
            return True
            
        if not signature:
            logger.error("No signature provided")
            return False
            
        # GitHub sends signature as sha256=<hash>
        expected_signature = 'sha256=' + hmac.new(
            SECRET.encode('utf-8'),
            body,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)
    
    def deploy_async(self):
        """Run deployment in a separate thread"""
        def deploy():
            try:
                logger.info("Starting deployment...")
                
                # Change to project directory
                project_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                os.chdir(project_dir)
                
                # Pull latest changes
                logger.info("Pulling latest changes from git...")
                subprocess.run(['git', 'pull', 'origin', 'main'], check=True)
                
                # Run deployment script
                logger.info("Running deployment script...")
                result = subprocess.run(
                    [DEPLOY_SCRIPT, '--automated'],
                    capture_output=True,
                    text=True,
                    timeout=300  # 5 minute timeout
                )
                
                if result.returncode == 0:
                    logger.info("Deployment completed successfully")
                    logger.info(f"Deployment output: {result.stdout}")
                else:
                    logger.error(f"Deployment failed with exit code {result.returncode}")
                    logger.error(f"Deployment error: {result.stderr}")
                    
            except subprocess.TimeoutExpired:
                logger.error("Deployment timed out after 5 minutes")
            except Exception as e:
                logger.error(f"Deployment failed with exception: {e}")
        
        # Start deployment in background thread
        deployment_thread = threading.Thread(target=deploy)
        deployment_thread.daemon = True
        deployment_thread.start()
    
    def do_POST(self):
        """Handle POST requests (GitHub webhooks)"""
        try:
            # Get content length
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error(400, "No content")
                return
            
            # Read body
            body = self.rfile.read(content_length)
            
            # Get headers
            signature = self.headers.get('X-Hub-Signature-256')
            event_type = self.headers.get('X-GitHub-Event')
            delivery_id = self.headers.get('X-GitHub-Delivery')
            
            logger.info(f"Received webhook: event={event_type}, delivery={delivery_id}")
            
            # Verify signature
            if not self.verify_signature(body, signature):
                logger.error("Invalid signature")
                self.send_error(401, "Invalid signature")
                return
            
            # Parse JSON payload
            try:
                payload = json.loads(body.decode('utf-8'))
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON payload: {e}")
                self.send_error(400, "Invalid JSON")
                return
            
            # Handle push events
            if event_type == 'push':
                ref = payload.get('ref', '')
                repository = payload.get('repository', {}).get('full_name', 'unknown')
                
                logger.info(f"Push event: {repository} -> {ref}")
                
                # Only deploy on push to main branch
                if ref == 'refs/heads/main':
                    logger.info("Push to main branch detected, triggering deployment...")
                    self.deploy_async()
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    
                    response = {
                        'status': 'success',
                        'message': 'Deployment triggered',
                        'timestamp': datetime.now().isoformat()
                    }
                    self.wfile.write(json.dumps(response).encode('utf-8'))
                else:
                    logger.info(f"Ignoring push to {ref} (not main branch)")
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    
                    response = {
                        'status': 'ignored',
                        'message': f'Push to {ref} ignored (not main branch)',
                        'timestamp': datetime.now().isoformat()
                    }
                    self.wfile.write(json.dumps(response).encode('utf-8'))
            
            elif event_type == 'ping':
                # GitHub ping event (webhook test)
                logger.info("Ping event received")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                
                response = {
                    'status': 'success',
                    'message': 'Webhook endpoint is working',
                    'timestamp': datetime.now().isoformat()
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
            
            else:
                logger.info(f"Ignoring event type: {event_type}")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                
                response = {
                    'status': 'ignored',
                    'message': f'Event type {event_type} ignored',
                    'timestamp': datetime.now().isoformat()
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                
        except Exception as e:
            logger.error(f"Error handling webhook: {e}")
            self.send_error(500, "Internal server error")
    
    def do_GET(self):
        """Handle GET requests (status/health check)"""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/health':
            # Health check endpoint
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            response = {
                'status': 'healthy',
                'service': 'webhook-deploy',
                'timestamp': datetime.now().isoformat(),
                'uptime': time.time() - start_time
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        elif parsed_path.path == '/status':
            # Status endpoint
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            
            html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Webhook Deploy Status</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 40px; }}
                    .status {{ background: #e8f5e8; padding: 20px; border-radius: 5px; }}
                    .log {{ background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px; }}
                    pre {{ overflow-x: auto; }}
                </style>
            </head>
            <body>
                <h1>🚀 Webhook Deploy Status</h1>
                
                <div class="status">
                    <strong>Status:</strong> Running<br>
                    <strong>Uptime:</strong> {time.time() - start_time:.1f} seconds<br>
                    <strong>Last Update:</strong> {datetime.now().isoformat()}<br>
                    <strong>Webhook Secret:</strong> {"✓ Configured" if SECRET else "⚠ Not configured"}
                </div>
                
                <h2>Recent Logs</h2>
                <div class="log">
                    <pre>{"Check " + LOG_FILE + " for detailed logs"}</pre>
                </div>
                
                <h2>Endpoints</h2>
                <ul>
                    <li><code>/health</code> - Health check (JSON)</li>
                    <li><code>/status</code> - Status page (HTML)</li>
                    <li><code>/webhook</code> - GitHub webhook endpoint (POST)</li>
                </ul>
            </body>
            </html>
            """
            self.wfile.write(html.encode('utf-8'))
            
        else:
            self.send_error(404, "Not found")

def main():
    global start_time
    start_time = time.time()
    
    # Parse command line arguments
    port = DEFAULT_PORT
    if len(sys.argv) > 1:
        if sys.argv[1] == '--help':
            print(__doc__)
            sys.exit(0)
        try:
            port = int(sys.argv[1])
        except ValueError:
            logger.error("Invalid port number")
            sys.exit(1)
    
    # Check if deploy script exists
    if not os.path.exists(DEPLOY_SCRIPT):
        logger.error(f"Deploy script not found: {DEPLOY_SCRIPT}")
        sys.exit(1)
    
    # Create HTTP server
    server_address = ('', port)
    httpd = HTTPServer(server_address, WebhookHandler)
    
    logger.info(f"🚀 Webhook deploy server starting on port {port}")
    logger.info(f"Webhook endpoint: http://localhost:{port}/webhook")
    logger.info(f"Status page: http://localhost:{port}/status")
    logger.info(f"Health check: http://localhost:{port}/health")
    
    if not SECRET:
        logger.warning("⚠ No webhook secret configured - set WEBHOOK_SECRET environment variable")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Shutting down webhook server...")
        httpd.shutdown()

if __name__ == '__main__':
    main()