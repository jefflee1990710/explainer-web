---
name: switch-comfy-gpu
description: >-
  Switch the Explainer OpenJutsu Comfy box among RTX 4060 Ti, RTX 6000 Ada,
  and RTX PRO 6000 WS on Vast.ai, then point local and Vercel COMFY_BASE_URL
  at that machine and redeploy www.scro.io. Idle Ada and PRO 6000 are destroyed
  so they cost nothing until a switch creates and loads them. Use when the user
  asks to switch, start, stop, close, or list the Vast Comfy GPU, or names
  4060, ada, pro6000, 48GB, or 96GB.
---

# Switch Comfy GPU

Run from `/Users/jefflee/Projects/Explainer.io/explainer-web`. Reply in Traditional Chinese.

The fleet is only `4060`, `ada`, and `pro6000` in `scripts/comfy-gpus.json`. Never start, stop, or destroy any other Vast instance. `casual-1b7-sft2000` (instance `55928035`, RTX 4090) is outside this fleet.

## Cost

A stopped Vast instance still bills its disk. Ada and PRO 6000 must not exist while idle. Do not stop-and-keep them, and do not rent them before a switch. Until `use ada` or `use pro6000`, those two cards cost $0.

`use` rents the chosen expensive card and waits until that machine is running. It then installs OpenJutsu when `/workspace/openjutsu-setup.done` is missing, and it does not return until that file exists and the published port answers `/queue`. Only then does it rewrite `.env.local` `COMFY_BASE_URL`. A Vast port mapping is not enough: nothing may be listening yet. Switching away deletes that instance. The RTX 4060 Ti stays in the account; leaving it only stops it, so the weights remain and a small disk fee continues.

If `list` shows a stopped, exited, or loading Ada or PRO 6000, run `close` before anything else.

## Choose the target

| User says | Command id |
|---|---|
| 4060, 4060 Ti, cheap, current | `4060` |
| Ada, 48GB, 6000 Ada | `ada` |
| PRO 6000, 96GB, Blackwell | `pro6000` |

If they did not name one of these, run `list` and ask which id to start. Do not guess. Do not rent a card just to show the list. Do not rent a second 4060 if `59041320` is missing from the account.

## Switch

1. `npm run comfy:gpu -- list`
2. If Ada or PRO 6000 has an instance and is not the chosen card, `npm run comfy:gpu -- close`
3. `npm run comfy:gpu -- use <id>`
4. After `use` exits 0, update Vercel and redeploy. Skip this step when `use` fails.

`use` creates `ada` or `pro6000` only when that slot has no instance. Wait for the command. A new card can take several minutes to boot, then the weight download runs inside that same command. Do not update Vercel while `use` is still running, and do not update it if `use` fails. Do not stop an instance while its status is still `loading`; that wedges the contract. If `use` reports `Required resources are currently unavailable` and `list` shows `loading→stopped`, run `npm run comfy:gpu -- repair` instead of retrying `use`. Repair destroys the stuck contract and returns to `4060`. It does not rent a replacement until the next `use`. After a successful repair, still update Vercel to the 4060 URL and redeploy.

If `use` fails because OpenJutsu did not answer, read `/workspace/openjutsu-setup.log` on that same instance. A traceback there means setup aborted before Comfy started. Fix the setup script and rerun `use` on that instance. Do not point `www.scro.io` at it, and do not rent a second machine.

## Vercel

Project is `explainer-web` on team `novax`. `COMFY_BASE_URL` exists separately for Production, Preview, and Development. A running deployment keeps its old value, so changing the variable is not enough.

Read the URL that `use` printed. Do not read or print `COMFY_API_KEY`. Update all three environments, then redeploy production and wait until that deployment is ready:

```bash
npx vercel env update COMFY_BASE_URL production --value "<COMFY_BASE_URL>" --yes --scope novax --non-interactive
npx vercel env update COMFY_BASE_URL preview --value "<COMFY_BASE_URL>" --yes --scope novax --non-interactive
npx vercel env update COMFY_BASE_URL development --value "<COMFY_BASE_URL>" --yes --scope novax --non-interactive
npx vercel redeploy www.scro.io --target production --scope novax
```

If one `env update` says the variable is missing for that environment, continue with the other environments. Do not deploy local uncommitted files with `vercel deploy --prod`.

After it finishes, tell them:

- which GPU is active and the `COMFY_BASE_URL`
- Vercel Production, Preview, and Development now use that URL
- `www.scro.io` was redeployed; give the deployment URL or say it is ready
- restart local `npm run dev` so the local server reads `.env.local`
- `use` already waited until ComfyUI answered; the first clip can still be slow while the weights enter VRAM
- an idle Ada or PRO 6000 has no instance and no charge

Do not print `VAST_API_KEY` or `COMFY_API_KEY`.
