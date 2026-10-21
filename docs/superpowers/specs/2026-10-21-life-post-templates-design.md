# Life post templates — design

Date: 2026-10-21
Status: approved (direction); taxonomy pending analysis review

## Goal

Give `/app/life` a list of post-type templates (with shooting guidelines) so a user can pick
"what kind of post" an AI influencer is making, optionally upload a composition reference image,
and generate a new life shot that follows that template.

## Decisions

- **Reference image role:** composition / pose reference only. The model copies pose, camera angle
  and framing from it; face, hair and outfit still come from the identity image, place from the scene image.
- **Template sample thumbnails:** generated with Gemini. Downloaded IG photos (other creators' content)
  are used only for offline analysis and never shipped.
- **Analysis:** Gemini 2.5 Flash labels every downloaded IG post (~3.7k images across 9 accounts)
  into structured JSON; a stats report drives the taxonomy.
- **Granularity:** two levels — about 6–8 categories, about 25–40 templates in total.
- **Storage:** static TypeScript catalog (like `CHARACTER_LOOKS`), no Mongo collection.

## 1. Offline analysis (not shipped)

- `experiments/classify-instagram-posts.ts` → `experiments/ig-post-labels.jsonl` (resumable).
  Fields per image: subject presence, shot type, framing, camera angle, facing, setting, pose notes,
  props, lighting, mood, free-text template hint.
- `experiments/summarize-instagram-labels.ts` → `experiments/ig-post-taxonomy.md`
  (frequency tables + representative samples). The taxonomy is reviewed with the user before code.

## 2. Model

`src/model/life-post-template.ts`

- `LifePostCategory { id, icon }`
- `LifePostTemplate { id, categoryId, framing, promptGuide, kind }`
  - `promptGuide`: English composition/pose fragment appended to the life shot prompt.
  - `kind`: maps to existing `LIFE_SHOT_KINDS`.
- Names and user-facing tips live in i18n `life.templates.*` (EN + zh-Hant).
- Sample previews: `public/life-templates/{id}.webp`, seeded by a Gemini script mirroring
  `scripts/seed-missing-look-previews.ts`.

## 3. UI (`src/presentation/components/app/life/`)

- Template picker: category tabs + template card grid (follow the look dialog grid style).
- Guideline panel for the selected template: tips + optional "composition reference" upload.
- One component per file.

## 4. Generation

- `generateLifeShotAction` gains optional `templateId` and `compositionRefUrl`.
- `lifeShotPrompt` appends the template `promptGuide`; when a composition reference is attached it is added
  to `referenceImageUrls` with an instruction to copy only pose, angle and framing from that image.
- `LifeShot` gains optional `templateId` and `compositionRefUrl`. No template = current behaviour.

## Appendix A — Analysis result (draft taxonomy, for review)

Source: 3,658 IG posts from 9 accounts labelled by `gemini-3.8-flash` (`experiments/ig-post-taxonomy.md`).
Headline mix: posed portrait 46%, OOTD full body 11%, candid 10%, arm selfie 8%, group 4%,
scenery 4%, interior 4%, food 3%. Settings: street 19%, cafe/restaurant 17%, home 10%, nature 9%,
beach 7%, travel landmark 6%. 77% solo person, 64% facing camera, 74% eye level, 20% high angle.
`n` = matching labelled posts (a post can match several templates).

| category | template id | 名稱 | n | framing | recipe |
| --- | --- | --- | --- | --- | --- |
| street | `street-ootd-full` | 街頭全身 OOTD | 163 | full | standing full body, outfit fully visible, street/storefront, eye level |
| street | `street-knee-up` | 街頭膝上人像 | 190 | knee-up | standing knee-up, facing camera, shallow street background |
| street | `street-walking` | 走路抓拍 | 128 | full | mid-stride walking, looking ahead or away, candid |
| street | `street-look-back` | 回眸 | 164 | knee-up | body turned away, looking back over shoulder at camera |
| street | `street-lean-wall` | 倚牆／店門 | 543 | full | leaning on wall, railing or storefront, one knee bent |
| street | `street-night-flash` | 夜晚閃光燈 | 323 | knee-up | direct on-camera flash at night, dark background |
| street | `street-crouch-high` | 高角度蹲姿 | 76 | full | crouching, shot from slightly above |
| cafe | `cafe-seated-camera` | 咖啡廳坐姿看鏡頭 | 188 | half | seated at table, facing camera, drink on table |
| cafe | `cafe-candid-away` | 咖啡廳抓拍 | 66 | upper | seated, looking away / out the window, natural smile |
| cafe | `cafe-chin-on-hand` | 托腮 | 52 | upper | elbow on table, chin or cheek resting on hand |
| cafe | `cafe-holding-drink` | 手拿飲品 | 222 | half | holding iced drink / cup near face or chest |
| cafe | `cafe-with-dessert` | 甜點合照 | 109 | half | posing beside or holding dessert / food |
| cafe | `cafe-table-overhead` | 桌面美食俯拍 | 110 | none / hands | overhead or high angle table spread, optional hand |
| cafe | `cafe-interior-corner` | 店內一角 | 128 | small figure | interior wide shot, character small in the scene |
| selfie | `selfie-high-arm` | 高角度手持自拍 | 288 | upper | phone held above eye level, looking up at camera |
| selfie | `selfie-mirror-cover` | 鏡子自拍遮臉 | 62 | half / full | mirror selfie, phone or camera covering part of face |
| selfie | `selfie-home-bed` | 居家／床上自拍 | 71 | upper | arm selfie on bed or sofa, cozy indoor light |
| selfie | `selfie-beauty-close` | 美妝特寫 | 144 | face | face close-up, hand near face, soft light |
| home | `home-sofa-lounge` | 沙發慵懶 | 98 | half / full | lounging on sofa or bed, relaxed |
| home | `home-window-light` | 窗邊光影 | 80 | half | standing or sitting by window, side daylight |
| home | `home-morning-bed` | 起床日常 | 23 | half | in bed, morning light, candid |
| home | `home-product` | 好物分享 | 68 | half | holding / showing a product toward camera |
| travel | `travel-landmark` | 地標打卡 | 225 | knee-up / full | posed in front of landmark, landmark readable |
| travel | `travel-beach-resort` | 海邊度假 | 265 | full | beach / pool / resort, sunlight |
| travel | `travel-back-view` | 背影看風景 | 50 | full | back to camera facing the view |
| travel | `travel-railing-view` | 欄杆遠眺 | 158 | knee-up | leaning on railing, scenic background |
| travel | `travel-nature` | 自然公園 | 322 | knee-up | park / greenery / flowers, soft daylight |
| social | `social-friends` | 朋友合照 | 152 | full | 2–4 people posing together (others are generic extras) |
| social | `social-party-flash` | 派對閃光燈 | 134 | half | indoor event, flash, celebratory |
| social | `social-sport` | 運動日常 | 136 | full | gym / court, active candid or post-workout pose |

Excluded: text graphics / quote cards (2%), pets (0.5%), flat lays (0.3%), POV detail shots (0.2%) —
they do not feature the character or are too rare.

## 5. Tests

- `node:test`: prompt assembly with/without template and reference; catalog integrity
  (unique ids, every template has a category, EN + zh-Hant names and tips).
- No paid provider calls in unit tests.
