#!/bin/bash
# Bootstrap a Vast.ai GPU instance with ComfyUI, OpenJutsu H3 models, Node.js 22, NVENC-ready FFmpeg, and the Explainer Worker daemon.
set -euo pipefail
exec > >(tee -a /workspace/vast-worker-setup.log) 2>&1
echo "[vast-worker-setup] start $(date -u +%Y-%m-%dT%H:%M:%SZ)"

export DEBIAN_FRONTEND=noninteractive
export NVIDIA_DRIVER_CAPABILITIES=all
mkdir -p /workspace

# Disable newer CUDA compat libcuda if host driver already provides CUDA 13.0
if [ -d /usr/local/cuda-13.0/compat ] && [ ! -d /usr/local/cuda-13.0/compat.disabled ]; then
  mv /usr/local/cuda-13.0/compat /usr/local/cuda-13.0/compat.disabled
  ldconfig || true
fi

PYTHON=/venv/main/bin/python
PIP=/venv/main/bin/pip
if [ ! -x "$PYTHON" ]; then
  PYTHON=python3
  PIP="python3 -m pip"
fi

apt-get update -y
apt-get install -y git ffmpeg curl ca-certificates gnupg rsync

# Install Node.js 22 LTS if not already installed
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  echo "[vast-worker-setup] installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

$PIP install -U huggingface_hub

if [ ! -d /workspace/ComfyUI ]; then
  git clone --depth 1 https://github.com/comfyanonymous/ComfyUI.git /workspace/ComfyUI
fi
cd /workspace/ComfyUI
$PIP install -r requirements.txt

declare -a REPOS=(
  "https://github.com/D3voz/comfyui-h3-oneclick-swap"
  "https://github.com/Adudeguyman/ComfyUI-Fantastic-MiniMaxH3-PromptBuilder"
  "https://github.com/ethanfel/ComfyUI-MiniMaxH3-Context-Loop"
  "https://github.com/kijai/ComfyUI-KJNodes"
  "https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite"
  "https://github.com/Carasibana/ComfyUI-H3-FaceRefine"
  "https://github.com/ltdrdata/ComfyUI-Impact-Pack"
  "https://github.com/D3voz/comfyui-websocket-reconnect-fix"
)
mkdir -p custom_nodes
for url in "${REPOS[@]}"; do
  name="$(basename "$url")"
  if [ ! -d "custom_nodes/$name" ]; then
    git clone --depth 1 "$url" "custom_nodes/$name"
  fi
  if [ -f "custom_nodes/$name/requirements.txt" ]; then
    $PIP install -r "custom_nodes/$name/requirements.txt" || true
  fi
done

$PYTHON - <<'PY'
from huggingface_hub import hf_hub_download
import os
jobs = [
    ("Comfy-Org/MiniMax-H3", "diffusion_models/minimax_h3_ref2va_pruned_int8_convrot.safetensors", "models/diffusion_models"),
    ("Kijai/MiniMax-H3-experimental", "loras/minimax_h3_DMAD_4step_full_lora_avg_rank_39_bf16.safetensors", "models/loras"),
    ("Merserk/MiniMax-H3-INT4-ConvRot", "qwen3vl_32b_minimax_h3_int4_convrot.safetensors", "models/text_encoders"),
    ("Comfy-Org/Qwen3-VL", "text_encoders/qwen3vl_8b_int8_convrot.safetensors", "models/text_encoders"),
    ("Comfy-Org/MiniMax-H3", "vae/minimax_h3_video_vae_int8_convrot.safetensors", "models/vae"),
    ("Comfy-Org/MiniMax-H3", "vae/minimax_h3_audio_vae_fp32.safetensors", "models/vae"),
    ("Comfy-Org/sam3.1", "checkpoints/sam3.1_multiplex_fp16.safetensors", "models/checkpoints"),
    ("Bingsu/adetailer", "face_yolov8m.pt", "models/ultralytics/bbox"),
    ("Bingsu/adetailer", "person_yolov8m-seg.pt", "models/ultralytics/segm"),
    ("datasets/Gourieff/ReActor", "models/sams/sam_vit_b_01ec64.pth", "models/sams"),
]
for repo, filename, dest in jobs:
    os.makedirs(dest, exist_ok=True)
    target = os.path.join(dest, os.path.basename(filename))
    if os.path.exists(target) and os.path.getsize(target) > 1_000_000:
        print("have", target, flush=True)
        continue
    print("download", repo, filename, flush=True)
    path = hf_hub_download(repo, filename)
    if os.path.abspath(path) != os.path.abspath(target):
        if os.path.lexists(target):
            os.remove(target)
        os.symlink(path, target)
    print("saved", target, os.path.getsize(target), flush=True)
PY

if [ -x /workspace/explainer-worker/worker/setup/start-worker.sh ]; then
  /workspace/explainer-worker/worker/setup/start-worker.sh
fi

echo "[vast-worker-setup] done $(date -u +%Y-%m-%dT%H:%M:%SZ)"
touch /workspace/vast-worker-setup.done
