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

# 0. Ensure H3ClipShots in comfyui-h3-oneclick-swap samples 4 chronological frames per shot (>=2s) instead of only 2
ONECLICK_INIT="/workspace/ComfyUI/custom_nodes/comfyui-h3-oneclick-swap/__init__.py"
if [ -f "$ONECLICK_INIT" ] && grep -q "The images come in pairs, the first and last frame of each shot:" "$ONECLICK_INIT"; then
  echo "[start-worker] patching H3ClipShots to sample 4 frames per shot..."
  $PYTHON - <<'PY'
path = "/workspace/ComfyUI/custom_nodes/comfyui-h3-oneclick-swap/__init__.py"
with open(path, "r") as f:
    text = f.read()
old = '''        lines = ["The clip has %d shot%s. The images come in pairs, the first and last frame of each shot:" % (len(bounds), "" if len(bounds) == 1 else "s")]
        for k, (a, b) in enumerate(bounds, 1):
            picks += [a + (b - a) // 6, b - 1 - (b - a) // 6]
            lines.append("Images %d and %d: shot %d, from %s to %s." % (2 * k - 1, 2 * k, k, timestamp(a / FPS), timestamp(b / FPS)))'''
new = '''        lines = ["The clip has %d shot%s. The images show each shot in chronological order from start to end:" % (len(bounds), "" if len(bounds) == 1 else "s")]
        for k, (a, b) in enumerate(bounds, 1):
            span = max(1, b - a)
            shot_picks = [a + span // 12, a + (span * 4) // 12, a + (span * 8) // 12, b - 1 - span // 12] if span >= 48 else [a + span // 6, b - 1 - span // 6]
            first_img = len(picks) + 1
            picks += shot_picks
            lines.append("Images %d to %d: shot %d, from %s to %s." % (first_img, len(picks), k, timestamp(a / FPS), timestamp(b / FPS)))'''
if old in text:
    with open(path, "w") as f:
        f.write(text.replace(old, new, 1))
    print("Patched H3ClipShots successfully.")
PY
  pkill -9 -f "main.py --listen 127.0.0.1 --port 8188" >/dev/null 2>&1 || true
  sleep 2
fi

# 1. Ensure ComfyUI is supervised on 127.0.0.1:8188 with --fast-disk so NVMe disk-backed mmap is used inside Docker
if ! pgrep -f "main.py --listen 127.0.0.1 --port 8188 --disable-auto-launch --fast-disk" >/dev/null 2>&1; then
  pkill -9 -f "comfy-supervisor" >/dev/null 2>&1 || true
  pkill -9 -f "main.py --listen 127.0.0.1 --port 8188" >/dev/null 2>&1 || true
  sleep 1
  echo "[start-worker] starting ComfyUI supervisor on 127.0.0.1:8188 (--fast-disk)..."
  cd /workspace/ComfyUI
  nohup bash -c "exec -a comfy-supervisor bash -c 'while true; do $PYTHON main.py --listen 127.0.0.1 --port 8188 --disable-auto-launch --fast-disk >> /workspace/comfy.log 2>&1; echo \"[comfy-supervisor] exited with \$?, restarting in 3s...\" >> /workspace/comfy.log; sleep 3; done'" >/dev/null 2>&1 &
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

# 3. The claim loop runs only when Vercel has handed the queue to this box.
#    Otherwise ComfyUI (and its proxy) is the GPU/CPU endpoint Vercel calls.
if [ "${WORKER_QUEUE_ENABLED:-}" != "true" ] && [ "${WORKER_QUEUE_ENABLED:-}" != "1" ]; then
  pkill -9 -f "worker-supervisor" >/dev/null 2>&1 || true
  pkill -9 -f "worker/src/index.ts" >/dev/null 2>&1 || true
  echo "[start-worker] WORKER_QUEUE_ENABLED is off. ComfyUI stays up; this box will not claim tasks."
elif [ -d /workspace/explainer-worker ]; then
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
