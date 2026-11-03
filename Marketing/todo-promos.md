# Pending Marketing Promo Videos (`Marketing/`)

## 1. Promo A v2 (Exaggerated Casual Messy Room Opening -> Teleport)
- **Character**: `Scro` (`6ae0d86cf75348b44a26322c`), casual outfit (pale pink athletic crop top + baggy medium-blue jeans + off-shoulder coffee-stained grey hoodie).
- **Visual Hook (0–2s)**: Wild messy bedhead hair sticking out, smudges of dirt/coffee on cheek, wide-eyed shocked panic expression clutching hair in an ultra-chaotic disaster bedroom (toppled takeout boxes, laundry mountains, tangled cables).
- **Spoken Line (English)**: *"OMG my room is a total disaster and my shoot starts in 5 seconds!"* -> snaps fingers with a sudden grin.
- **Teleport Payoff (2–6s)**:
  - `2–4s`: NYC Golden-Hour Sunset Penthouse Loft (`runTeleportJobInBackground`).
  - `4–6s`: Tokyo Shibuya Rainy Neon Night (`runTeleportJobInBackground`).

## 2. Promo C (E-Commerce / OOTD Hallway -> Paris Left Bank Lookbook)
- **Hook**: Filming OOTD in a plain apartment hallway vs. 1-click Paris cobblestone street editorial shoot via Scro Teleport.
- **Pipeline**: Reuse `src/service/teleport/pipeline.ts` (`runTeleportJobInBackground`) + FFmpeg Before/After hook overlays -> send to Telegram.

## 3. Promo D (Reverse Reveal Meme: "My boss asked why I'm on Zoom from the Maldives on a Tuesday...")
- **Hook (0–3.5s)**: Starts with the Teleported Maldives overwater bungalow clip while holding a coffee mug on a Zoom call.
- **Reveal (3.5–6s)**: Cuts back to the raw source clip on a cramped apartment couch + shows the beach photo used in Scro Teleport.
- **Pipeline**: Reuse `src/service/teleport/pipeline.ts` -> send to Telegram.
