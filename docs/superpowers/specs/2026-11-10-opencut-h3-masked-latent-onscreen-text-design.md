# OpenCut AI On-Screen Text via SAM 3 Safe-Zone + H3 Masked Latent Video Inpainting Design

## Intent & Why
Replace the legacy chroma-key (`#FF00FF` / `#0055FF`) static sticker approach in OpenCut's AI On-Screen Text (`ScroOnScreenTextPanel` / `src/service/opencut/on-screen-text.ts`) with a seamless **SAM 3 Face-Safe Centered Zone + Vast.ai ComfyUI `MiniMax-H3` Masked Latent Video Inpainting** pipeline:
1. Extract the active video clip's frame at the playhead (`clipIndex` / `playheadSeconds`).
2. Segment the frame with SAM 3 (`fal-ai/sam-3/image-rle`) to strictly avoid human faces (`face`) while allowing overlap with torso/body (`person` minus `face`), strongly favoring horizontal center (`cx ≈ 0.50`), vertical center or slightly below/above center (`cy ∈ {0.64, 0.50, 0.32}`), low-variance regions, and penalizing the 4 corners.
3. Paint the requested artistic lettering style (Torn Paper, Marker, Sticker, Neon, etc.) directly into `bestBox` on the start frame via `bytedance-seed/seedream-5-0-pro` so lighting, perspective, and shadows match the scene natively.
4. When Vast.ai ComfyUI (`COMFY_BASE_URL` + `COMFY_API_KEY`) is configured, submit a **Masked Latent Video Inpainting** job (`MiniMaxH3FantasticVideoEditLatent` + `MiniMaxH3ContexMaskedTarget` with `mask_meaning: "white = generate"`, locking the black non-mask area 100% and regenerating only the white `bestBox` mask area guided by the painted start frame) so the artistic text is seamlessly painted into the video clip (with soft-feathered alpha/video fallback when ComfyUI is offline).

## Goals & Non-Goals
- **Goals**:
  - Zero face occlusion (`face` mask strictly avoided; body/torso overlap permitted).
  - Horizontally centered (`cx ≈ 0.5`), vertically centered or slightly below/above center, avoiding all 4 corners.
  - Seamless H3 Masked Latent video inpainting in the `bestBox` mask region when ComfyUI is available, plus high-quality in-scene feathered patch extraction for timeline overlay compatibility.
- **Non-Goals**:
  - Changing standard editable text track (`subtitle-track-style-controls.tsx`) — only AI On-Screen Text (`ScroOnScreenTextPanel`) is upgraded.

## Approaches Considered
- **Approach A (Still-frame in-place diff overlay only)**: Fast (~10s), but produces a static PNG overlay rather than H3 Masked Latent video inpainting.
- **Approach B (Selected — SAM 3 Centered Face-Safe Zone + Seedream In-Scene First Frame + ComfyUI H3 Masked Latent Video Inpainting)**: Matches `Masked_Inpainting_Plan.txt` and user selection in message `1576`.
