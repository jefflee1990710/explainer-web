#!/bin/bash
# Starts local ComfyUI (127.0.0.1:8188), optional proxy (8189), and the Explainer TypeScript Worker daemon.
set -euo pipefail

PYTHON=/venv/main/bin/python
if [ ! -x "$PYTHON" ]; then
  PYTHON=python3
fi

if [ -z "${COMFY_PROXY_TOKEN:-}" ] && [ -f /workspace/.comfy-token ]; then
  export COMFY_PROXY_TOKEN="$(cat /workspace/.comfy-token)"
fi

# 1. Ensure ComfyUI is supervised on 127.0.0.1:8188 with --cache-none so intermediate tensors are freed immediately
if ! pgrep -f "main.py --listen 127.0.0.1 --port 8188" >/dev/null 2>&1; then
  pkill -9 -f "comfy-supervisor" >/dev/null 2>&1 || true
  echo "[start-worker] starting ComfyUI supervisor on 127.0.0.1:8188..."
  cd /workspace/ComfyUI
  nohup bash -c "exec -a comfy-supervisor bash -c 'while true; do $PYTHON main.py --listen 127.0.0.1 --port 8188 --disable-auto-launch --cache-none >> /workspace/comfy.log 2>&1; echo \"[comfy-supervisor] exited with \$?, restarting in 3s...\" >> /workspace/comfy.log; sleep 3; done'" >/dev/null 2>&1 &
  sleep 4
fi

# 2. Ensure reverse proxy on 8189 is running if COMFY_PROXY_TOKEN is present
if [ -n "${COMFY_PROXY_TOKEN:-}" ] && ! pgrep -f "vast-openjutsu-proxy.py" >/dev/null 2>&1; then
  PROXY_SCRIPT="/workspace/explainer-worker/worker/setup/vast-openjutsu-proxy.py"
  if [ ! -f "$PROXY_SCRIPT" ] && [ -f "/workspace/vast-openjutsu-proxy.py" ]; then
    PROXY_SCRIPT="/workspace/vast-openjutsu-proxy.py"
  fi
  if [ -f "$PROXY_SCRIPT" ]; then
    echo "[start-worker] starting ComfyUI auth proxy on 0.0.0.0:8189..."
    nohup $PYTHON "$PROXY_SCRIPT" > /workspace/proxy.log 2>&1 &
  fi
fi

# 3. Restart the Explainer Worker daemon
if [ -d /workspace/explainer-worker ]; then
  cd /workspace/explainer-worker
  pkill -9 -f "worker-supervisor" >/dev/null 2>&1 || true
  pkill -9 -f "worker/src/index.ts" >/dev/null 2>&1 || true
  sleep 1
  : > /workspace/worker.log
  echo "[start-worker] starting Explainer Worker daemon..."
  nohup bash -c 'exec -a worker-supervisor bash -c "while true; do ./node_modules/.bin/tsx worker/src/index.ts >> /workspace/worker.log 2>&1; echo \"[worker-supervisor] exited with \$?, restarting in 3s...\" >> /workspace/worker.log; sleep 3; done"' >/dev/null 2>&1 &
  sleep 3
  echo "[start-worker] Worker PID(s): $(pgrep -f 'worker/src/index.ts' | tr '\n' ' ')"
fi
