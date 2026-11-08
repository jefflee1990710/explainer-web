#!/bin/bash
# Deploy the worker code and environment to a Vast.ai GPU instance over SSH and restart the daemon.
set -euo pipefail

SSH_HOST="${1:-173.62.207.124}"
SSH_PORT="${2:-41066}"
REMOTE_DIR="/workspace/explainer-worker"

echo "[deploy-vast] Deploying worker to root@${SSH_HOST}:${SSH_PORT} (${REMOTE_DIR})..."

ssh -o StrictHostKeyChecking=no -p "$SSH_PORT" "root@${SSH_HOST}" "
  if ! command -v node >/dev/null 2>&1 || [ \$(node -v | cut -d. -f1 | tr -d v) -lt 20 ]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs rsync
  fi
  mkdir -p ${REMOTE_DIR}
"

rsync -az --delete \
  --exclude '/.git' \
  --exclude '/.next' \
  --exclude '/node_modules' \
  --exclude '/opencut' \
  --exclude '/src/opencut' \
  --exclude '/.worktrees' \
  --exclude '/experiments' \
  -e "ssh -o StrictHostKeyChecking=no -p ${SSH_PORT}" \
  ./package.json ./package-lock.json ./tsconfig.json ./src ./worker \
  "root@${SSH_HOST}:${REMOTE_DIR}/"

if [ -f .env.local ]; then
  scp -o StrictHostKeyChecking=no -P "$SSH_PORT" .env.local "root@${SSH_HOST}:${REMOTE_DIR}/.env.local"
fi

ssh -o StrictHostKeyChecking=no -p "$SSH_PORT" "root@${SSH_HOST}" "
  cd ${REMOTE_DIR}
  grep -q '^COMFY_LOCAL_URL=' .env.local 2>/dev/null || echo 'COMFY_LOCAL_URL=http://127.0.0.1:8188' >> .env.local
  grep -q '^WORKER_WEB_API_URL=' .env.local 2>/dev/null || echo 'WORKER_WEB_API_URL=https://www.scro.io' >> .env.local
  npm install --no-audit --no-fund --ignore-scripts
  npm rebuild sharp
  if [ -f node_modules/ffmpeg-static/install.js ] && [ ! -x node_modules/ffmpeg-static/ffmpeg ]; then
    node node_modules/ffmpeg-static/install.js || true
  fi
  chmod +x worker/setup/*.sh worker/scripts/*.sh
  ./worker/setup/start-worker.sh
"

echo "[deploy-vast] Done!"
