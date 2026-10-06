# Handoff: render production on Higgsfield (images + video)

Instructions for the AI operating Higgsfield. Written 2026-10-06 by the Claude Code session that
built the gallery. Everything you produce lands in a Vue web gallery automatically if you follow the
naming rules — do not invent your own structure.

## What you are given

1. `assets/Crown Georgetown Photos/*.jpg.webp` — real photos of the Wormald model home. These are
   your **structural ground truth** for 18 of 19 rooms.
2. `docs/render-audit.md` — the architecture spec: a common block, a per-room spec (window counts,
   camera, fireplace geometry, owner overrides like TV-above-fireplace), and a QA checklist. Round
   one was generated text-only and ~40% of it broke the architecture. **Read it before generating
   anything.**
3. `docs/new-looks-brief.md` — material/palette blocks for the 5 new looks (`heritage`, `paris`,
   `crownloft`, `canyon`, `deco`) plus per-room notes.
4. This file — model selection, tasks, naming, and delivery.

The 19 rooms and their keys (floor → rooms):
`first-floor`: entry, gym, media, office, bath · `second-floor`: great, kitchen, dining, sunroom,
stair2 · `third-floor`: ownerbed, retreat, ownerbath, bed3, sharedbath, laundry · `penthouse`: loft,
bed5, terrace. The 9 existing looks: modern, blackwalnut, sageclay, navybrass, scandi, aman,
rosewood, parkhyatt, bulgari.

## Model selection on Higgsfield

**Images — use an image-EDIT workflow, never text-to-image.** The one non-negotiable: the model-home
photo goes IN as the source image, and the instruction restyles finishes/furniture/decor only.
- First choice: **Soul Inpaint / Soul edit with the room photo as the input image** (full-frame edit,
  low structural deviation). If the picker offers a dedicated instruction-edit model (e.g. Nano
  Banana / Seedream edit / FLUX Kontext class), that works too — whichever best preserves the input
  geometry at your strength setting.
- Plain **Soul / Soul 2.0 text-to-image is banned** for photographed rooms — that is exactly how
  round one went wrong. Text-to-image is allowed ONLY for Bath #3 (no photo; build from its spec in
  render-audit.md, then reuse your best Bath #3 result as the edit source for the other looks).
- Output: landscape 3:2, minimum 1536 px long edge, photoreal interior-photography style, no people,
  no text/watermarks.

**Video — image-to-video from an APPROVED still, never text-to-video.**
- First choice: **Higgsfield DoP (I2V)** — its camera presets are the whole point here. Allowed
  presets: slow dolly-in, slow dolly-out, slow lateral slide, gentle orbit/arc, crane-down. Nothing
  flashy: no crash zoom, no bullet time, no handheld shake, no speed ramps.
- If a room needs smoother photoreal motion than DoP gives you, fall back to **Kling 3.0** or
  **Veo 3.1** image-to-video with a static-interior prompt and minimal camera instruction. Mute/skip
  audio generation — these clips are silent.
- Settings: 1080p, 16:9 landscape, 5–8 s per room clip, 24 fps. The input frame is the approved
  render — the video must not alter architecture, finishes, or furniture placement; only the camera
  (and subtle life: fireplace flames, window light, sheer-curtain drift) moves.

## Task 1 — regenerate the broken originals (existing 9 looks)

Priority order from the audit: **great, kitchen, bed3, laundry, terrace** (all 9 looks each — 45
images), then stair2, dining, ownerbed, retreat, bed5, gym, office, loft (audit lists exact defects
per look; a render marked OK there can be kept). sharedbath, media, bath are usable as-is.
For every image: photo in → apply the common block + that room's spec from render-audit.md + the
look's palette (the 9 look descriptions are in `apps/web/src/redesigns.ts`) → QA checklist → export.

## Task 2 — the 5 new looks (95 images)

For each room × each of heritage/paris/crownloft/canyon/deco: photo in → common block + room spec
from render-audit.md + the look block and room notes from new-looks-brief.md → QA → export.

## Task 3 — video renders

Phase 1 (deliver this before expanding):
- **One clip per room (19)** in that room's hero look — default hero look is `modern` unless Jonathan
  specifies otherwise per room. Camera by room type:
  - entry: crane-down from balcony height toward the front door axis
  - great, media, loft, ownerbed, bed3, bed5, retreat: slow dolly-in toward the focal wall
    (fireplace/TV/bed)
  - kitchen, island rooms: gentle 20–30° arc around the island
  - dining: slow lateral slide across the table toward the arched windows
  - ownerbath, sharedbath, bath, laundry, sunroom, stair2: slow dolly-in down the room's long axis
  - terrace: slow lateral slide under the pergola ending on the fireplace wall
- **One tour per floor (4)**: 20–40 s, stitched from that floor's room clips in walking order
  (entry→office→media→gym→bath · dining→kitchen→sunroom→great→stair2 · ownerbed→retreat→ownerbath→
  bed3→sharedbath→laundry · loft→bed5→terrace), 0.5 s crossfades, no music, no titles.

Phase 2 (only when asked): repeat per look for the looks Jonathan short-lists.

## Naming and delivery (exact, case-sensitive)

- Images: `assets/renders/<floor>/<room>-<look>.png` (or .jpg) — e.g.
  `assets/renders/second-floor/great-heritage.png`. Full resolution; the repo script
  (`npm run build:renders`) makes the web copies, so do NOT pre-compress.
- Videos: `assets/renders-video/<floor>/<room>-<look>.mp4` and floor tours as
  `assets/renders-video/<floor>/tour-<look>.mp4`. H.264, 1080p, target ≤ 25 MB per clip.
- Deliver the files (folder upload/zip) to Jonathan; he drops them into the repo. The web gallery
  picks up images automatically; the video rail gets wired once the first clips exist.

## QA before you deliver each batch

Reject and rerun any output that fails one of these:
1. Window/door count and positions match the source photo and render-audit.md spec
2. Camera matches the photo's viewpoint (images) / stays within the allowed presets (video)
3. View outside = Crown streetscape / neighboring townhome rooftops — never countryside, ocean,
   mountains, or a skyscraper canyon
4. Room proportions match the plan dims; no invented tray/cove ceilings
5. Great room: two high transoms flanking the fireplace, TV ABOVE the fireplace
6. Kitchen: wall-oven column present at the right end of the back wall
7. Laundry: sink + both windows on the LEFT wall · Bed 3: bed on the RIGHT wall between its windows
8. No people, pets, text, watermarks, or brand logos; no audio in video files
