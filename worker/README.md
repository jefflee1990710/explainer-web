# Explainer.io Vast.ai Unified Worker (`worker/`)

This folder contains the self-contained Vast.ai GPU/CPU worker program, ComfyUI model & custom-node configuration, and deployment scripts.

## Architecture

- **Two-Lane Task Execution (`worker/src/runner.ts`)**:
  - **GPU Lane (`concurrency = 1`)**: Pulls `lane: "gpu"` tasks (`jutsu_swap`, `teleport`, `extend`, and ComfyUI `generation_refresh` for GPU-machine jobs) and executes them against local ComfyUI (`http://127.0.0.1:8188`). Storyboard MiniMax H3 `ref2va` is not local: `generation_submit` for those clips calls Vast serverless endpoint `scro-h3-comfy-serverless`.
  - **CPU / Cloud-API Lane (`concurrency = 6`)**: Concurrently pulls `lane: "cpu"` tasks (`storyboard_phase_a`, `storyboard_still`, `clip_generate`, `generation_submit`, `generation_refresh`, `reel_concat`, `final_render`, `life_shot`, `director_job`), using GPU `h264_nvenc` when supported by the host driver and falling back to `libx264` automatically.
- **ComfyUI & Model Manifest (`worker/config/models.json` & `worker/setup/vast-worker-setup.sh`)**:
  - Installs ComfyUI, all 8 OpenJutsu / MiniMax-H3 custom node repositories, and all 10 HuggingFace model weights (`MiniMax-H3`, `Qwen3-VL 32B/8B`, `SAM 3.1`, `ultralytics`, `sams`).
- **Workflows (`worker/workflows/`)**:
  - Contains `simple.api.json`, `object.api.json`, and `extend.api.json`.

## Scaling Up (Adding More Vast.ai Workers)

To add another Vast.ai GPU worker:
1. Rent a new Vast.ai GPU instance.
2. Run `./worker/scripts/deploy-vast.sh <PUBLIC_IP> <SSH_PORT>` (or run `worker/setup/vast-worker-setup.sh` on a fresh instance).
3. The new worker automatically joins the `workerTasks` pool and begins claiming tasks alongside existing workers.
