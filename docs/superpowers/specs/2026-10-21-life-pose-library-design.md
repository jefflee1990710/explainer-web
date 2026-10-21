# Life pose library — design

Date: 2026-10-21
Status: approved (direction); pose set pending skeleton review

## Goal

Let a user pick a human pose (from a library distilled from ~3.2k creator posts) and apply it to a
Life shot, independently of the post-type template.

## Decisions

- **Form:** stick-figure skeleton images derived from detected keypoints. No original photo pixels are shipped.
- **Relation to templates:** independent layer; any template + any pose.
- **Size:** about 60–100 poses, 5 categories (stand, sit, crouch/kneel, lie/lean, move) plus hand-action tags.

## 1. Offline extraction (not shipped)

- `experiments/poses/detect_poses.py` (MediaPipe Pose Landmarker, local, free) → `experiments/ig-pose-keypoints.jsonl`.
  Skip multi-person, low-confidence and heavily cropped bodies.
- `experiments/poses/cluster_poses.py`: normalise (hip-centred, torso-scaled, mirror-canonical), k-means (~150),
  keep the medoid of each solid cluster → 60–100 poses. Render skeleton PNGs and a contact sheet for review.
- Gemini text-only call names each cluster (EN + zh-Hant) and writes one English pose description from the
  cluster's existing `pose` labels.

## 2. Model

- Generated `src/model/life-poses.ts`: `{ id, category, framing, promptText, hands[] }`.
- Labels in `src/util/i18n/messages/life-poses.ts`.
- `public/life-poses/{id}.png`: coloured stick figure on a dark background — card thumbnail and model reference.

## 3. UI

- "Pose" button next to the post type → `LifePoseDialog` (category tabs, hand tag filter, skeleton grid).
- Selected pose chip with change / clear.

## 4. Generation

- `generateLifeShotAction` gains optional `poseId`. Skeleton PNG goes last in `referenceImageUrls`
  (needs a public https URL: `NEXT_PUBLIC_APP_URL` + path).
- Prompt: the Nth image is a pose skeleton; match the body pose exactly; never draw lines or dots; plus `promptText`.
- With both a pose and a composition reference, the composition reference only drives camera angle and crop.
- `LifeShot.poseId` optional.

## 5. Verification

- Unit tests for reference order, prompt wording, catalog integrity. No paid calls.
- 2–3 real Seedream generations only after the user approves.
