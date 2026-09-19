#!/usr/bin/env bash
# ==============================================================================
# ChatGPT Clone - Production VPS Deploy / Update Script
# Usage: ./deploy.sh [branch_name]
# Must be run on the target VPS by the 'deploy' user (or root)
# ==============================================================================

set -euo pipefail

APP_DIR="/var/www/chatgpt-clone"
BRANCH="${1:-master}"

echo "=========================================================="
echo " Starting ChatGPT Clone Deployment (Branch: ${BRANCH})"
echo " Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=========================================================="

cd "${APP_DIR}"

# 1. Fetch latest changes
echo "--> Step 1: Fetching latest git commits..."
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull origin "${BRANCH}"

# 2. Install backend production dependencies
echo "--> Step 2: Installing backend dependencies..."
cd "${APP_DIR}/server"
npm ci --omit=dev

# 3. Build frontend client
echo "--> Step 3: Building frontend client bundle..."
cd "${APP_DIR}/client"
npm ci
npm run build

# 4. Restart backend systemd service
echo "--> Step 4: Restarting systemd service..."
sudo systemctl restart chatgpt-clone

# 5. Reload Nginx configuration if modified
echo "--> Step 5: Testing and reloading Nginx..."
sudo nginx -t
sudo systemctl reload nginx

# 6. Verify health check
echo "--> Step 6: Verifying backend health..."
sleep 2
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/health || echo "000")

if [ "${HEALTH_RESPONSE}" = "200" ]; then
    echo " [OK] Backend is healthy (HTTP 200)!"
else
    echo " [ERROR] Backend health check failed with HTTP status: ${HEALTH_RESPONSE}"
    echo "Check logs using: journalctl -u chatgpt-clone -n 50 --no-pager"
    exit 1
fi

echo "=========================================================="
echo " Deployment completed successfully!"
echo "=========================================================="
