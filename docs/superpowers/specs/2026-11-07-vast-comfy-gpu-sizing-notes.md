# Vast.ai ComfyUI (OpenJutsu H3) GPU Sizing & Cost Reference

Recorded on: 2026-11-07

## Current Instance Baseline (`59041320` — `scro-openjutsu-poc`)

- **GPU**: `NVIDIA GeForce RTX 4060 Ti` (`16 GB VRAM`, ~288 GB/s memory bandwidth, ~22 TFLOPS)
- **System RAM / Disk**: `126 GB RAM` / `160 GB Disk`
- **Cost**: `$0.130 / hr` (`~$3.12 / day`)
- **Bottleneck**: `Qwen3-VL 32B (int4)` (~18 GB) and `MiniMax-H3 (int8)` (~18 GB) each exceed 16 GB VRAM, forcing constant PCIe weight offloading/swapping between System RAM and GPU VRAM on every step (~15.5 minutes for an 8.6s 2-chunk Scro Swap).

---

## Vast.ai Single-GPU Upgrade Comparison Table

Filtered for Verified hosts, reliability ≥ 99%, System RAM ≥ 60–250 GB, Disk ≥ 160 GB:

| Tier / Recommendation | GPU Model | VRAM | Memory BW / Compute | Hourly (`$/hr`) | Daily (`$/day`) | Est. 8.6s Scro Swap Render Time | Sample Location / Offer ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Current Baseline** | **RTX 4060 Ti** | **16 GB** | ~288 GB/s · 22 TFLOPS | **$0.130 / hr** | $3.12 / day | **~15.5 min** (VRAM thrashing / PCIe offload) | Pennsylvania, US (`59041320`, active) |
| **Budget Upgrade** | **RTX 4090** | **24 GB** | 878 GB/s · 81.4 TFLOPS | **$0.389 – $0.428 / hr** | $9.33 – $10.26 / day | **~5 – 6 min** (~3.5x faster compute & bandwidth) | Oregon, US (`58269703`) / Sweden (`55560924`) |
| **Mid-Tier 48GB (No Single-Model Offload)** | **RTX 6000 Ada** | **48 GB** | 765 GB/s · 81.4 TFLOPS | **$0.539 / hr** | $12.94 / day | **~4 – 5 min** (48GB VRAM fits each model cleanly without PCIe paging) | California, US (`59054159`, 7 Gbps net) |
| **Fast Blackwell 32GB** | **RTX 5090** | **32 GB** | 1,456 GB/s · 109.1 TFLOPS | **$0.513 – $0.602 / hr** | $12.30 – $14.45 / day | **~3.5 – 4.5 min** (high bandwidth & Blackwell tensor cores) | California, US (`54598654`) / Taiwan (`57376502`) |
| **Recommended Production (96GB `--highvram`)** | **RTX PRO 6000 Blackwell (Max-Q / S)** | **96 GB** | 1,400 GB/s · 119 TFLOPS | **$1.337 – $1.602 / hr** | $32.09 – $38.45 / day | **~2 – 3 min** (96GB VRAM holds `SAM 3.1` + `Qwen3-VL 32B` + `MiniMax-H3` resident in VRAM with `--highvram`; supports raising `OPENJUTSU_CLIP_SECONDS` from `6` to `9–10s` for single-pass render) | Michigan, US (`56921481`, $1.337/hr) / Taiwan (`58626057`, $1.572/hr) / Virginia, US (`47104051`, $1.602/hr, 36 Gbps net) |
| **Datacenter HBM3** | **H100 SXM** | **80 GB** | 2,876 GB/s · HBM3 | **$2.278 / hr** | $54.67 / day | **~1.5 – 2.5 min** | Montana, US (`56442966`) |
| **Datacenter Flagship HBM3e** | **H200 NVL** | **140 GB** | 3,889 GB/s · HBM3e | **$3.322 / hr** | $79.73 / day | **~1.5 – 2 min** | Colorado, US (`56958210`) |

---

## Upgrade Checklist (When Traffic Increases)

1. Provision a new Vast.ai instance using `scripts/vast-openjutsu-setup.sh` and `scripts/vast-openjutsu-proxy.py`.
2. If provisioning an **80GB–96GB+ GPU** (`RTX PRO 6000` / `H100` / `A100 80GB`):
   - Launch ComfyUI with `--highvram` in `scripts/vast-openjutsu-setup.sh` so weights stay resident in VRAM across jobs.
   - Increase `OPENJUTSU_CLIP_SECONDS` in `src/service/comfy/openjutsu-graph.ts` from `6` to `9` or `10` so 6–10s videos run in a single diffusion pass instead of 2 chained passes.
3. Update `COMFY_BASE_URL` (and `COMFY_API_KEY` if rotated) in `.env.local` and Vercel environment variables.
