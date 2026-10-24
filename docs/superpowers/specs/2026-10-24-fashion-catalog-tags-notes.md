# Fashion catalog tags + IG research notes

Date: 2026-10-24

## Goal

Grow the built-in wardrobe / Life databases and make every look, pose, and post type
searchable via `description` + `tags` (UI chips + MCP).

## Offline IG research (`experiments/` is gitignored)

Local `experiments/ig-posts/` holds Instagram creator downloads used only for analysis.
Downloaded creator photos are **never shipped**. Distill into:

- `src/service/character/*-wardrobe.ts` (`CharacterLookOption` with `description` + `tags`)
- `src/model/life-post-template.ts`
- pose clustering under `experiments/poses/`

### Download helper (tracked)

```bash
# Requires APIFY_TOKEN in .env.local — never commit secrets.
npx tsx scripts/experiments/download-instagram-posts.ts \
  --accounts=casual,yoga,tennis,pickleball,climbing \
  --limit=40
```

Taste buckets: casual/lounge (Tokyo·Seoul·HK·Mediterranean·Nordic), yoga/pilates,
tennis/court, Peek-A-Boo pickleball skorts, climbing.

After download → classify → review → add catalog rows → `scripts/seed-missing-look-previews.ts`.

## Shipped in this change

- Tags + searchable descriptions on wardrobe catalog / MCP `search_looks` + `list_wardrobe_catalog`
- Tag chips in the character look dialog
- Pickleball Peek-A-Boo + casual international wardrobe expansion
- New Life post templates (`social-pickleball`, `social-yoga-mat`, `street-casual-weekend`)
- Landing `#catalog` band showcasing database depth
