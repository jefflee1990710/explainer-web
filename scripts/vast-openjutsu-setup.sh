#!/bin/bash
# Install ComfyUI, the OpenJutsu custom nodes, and the H3 weights on a fresh Vast GPU box.
set -euo pipefail
exec > /workspace/openjutsu-setup.log 2>&1
echo $$ > /workspace/openjutsu-setup.pid
echo "setup start $(date -u +%Y-%m-%dT%H:%M:%SZ)"

export DEBIAN_FRONTEND=noninteractive
mkdir -p /workspace
# The image ships a newer CUDA compat libcuda that GeForce rejects (error 804).
# The host driver already supports CUDA 13.0, so use that library instead.
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
apt-get install -y git ffmpeg
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

if [ -z "${COMFY_PROXY_TOKEN:-}" ] && [ -f /workspace/.comfy-token ]; then
  COMFY_PROXY_TOKEN="$(cat /workspace/.comfy-token)"
  export COMFY_PROXY_TOKEN
fi

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
    # ReActor SAM lives in a dataset repo. "datasets/…" is not a valid repo id.
    ("Gourieff/ReActor", "models/sams/sam_vit_b_01ec64.pth", "models/sams", "dataset"),
]
for row in jobs:
    repo, filename, dest = row[0], row[1], row[2]
    repo_type = row[3] if len(row) > 3 else "model"
    os.makedirs(dest, exist_ok=True)
    target = os.path.join(dest, os.path.basename(filename))
    if os.path.exists(target) and os.path.getsize(target) > 1_000_000:
        print("have", target, flush=True)
        continue
    print("download", repo, filename, flush=True)
    path = hf_hub_download(repo, filename, repo_type=repo_type)
    if os.path.abspath(path) != os.path.abspath(target):
        if os.path.lexists(target):
            os.remove(target)
        os.symlink(path, target)
    print("saved", target, os.path.getsize(target), flush=True)
PY

# Comfy stays on loopback. The proxy on 8189 is the only published port.
# 80GB and larger cards keep the H3 weights resident. A 16GB 4060 cannot.
HIGHVRAM_ARG=""
VRAM_MB="$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | awk 'BEGIN{m=0} {if ($1+0>m) m=$1+0} END{print m}')"
if [ "${VRAM_MB:-0}" -ge 80000 ]; then
  HIGHVRAM_ARG="--highvram"
fi
if ! pgrep -f "python main.py --listen 127.0.0.1 --port 8188" >/dev/null 2>&1; then
  nohup $PYTHON main.py --listen 127.0.0.1 --port 8188 --disable-auto-launch $HIGHVRAM_ARG > /workspace/comfy.log 2>&1 &
fi
if ! pgrep -f "vast-openjutsu-proxy.py" >/dev/null 2>&1; then
  nohup $PYTHON /workspace/vast-openjutsu-proxy.py > /workspace/proxy.log 2>&1 &
fi
echo "setup done $(date -u +%Y-%m-%dT%H:%M:%SZ)"
touch /workspace/openjutsu-setup.done
