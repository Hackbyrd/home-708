# Task brief: add the redesign gallery to 708.hackbyrd.com

Written by Claude (Cowork) on 2026-10-06 for Claude Code. Work in this repo, on a new branch (not `main`).

## Goal

Add the whole-house redesign renders to the site so Jonathan can browse them next to the model-home photos. Today the only place they live is a private Claude artifact (https://claude.ai/artifact/L5txM8L3YXp5DHVutYXcfu). The site should replace that page.

What a viewer should be able to do:

1. Pick a floor (Entry level, Main level, Bedroom level, Penthouse).
2. See every room on that floor. Each room shows the model-home photo first, then one render per design look.
3. Filter to a single look (for example only "Navy & brass") across the whole floor.
4. Click any image for a full-size lightbox with left/right arrows and Escape, like the existing photo viewer.
5. On the Entry level, see the first-floor cost table (below).

## Where it fits in the code

- `apps/web/src/components/ReferenceViewer.vue` is the "Photos & blueprint" modal, with tabs `photos` and `blueprint`. Add a third tab, `Redesigns`, rather than building a new page. Reuse its lightbox and keyboard handling.
- `apps/web/src/reference.ts` loads the model-home photos with `import.meta.glob` from `assets/Crown Georgetown Photos/*.webp`. Do the same for the renders, in a new module such as `apps/web/src/redesigns.ts`.
- Match the existing glass/segmented styles in `apps/web/src/styles.css`.

## The renders

`assets/renders/` is currently untracked (`?? assets/renders/` in git status). Layout:

```
assets/renders/first-floor/   45 files (25 .png, 20 .jpg)
assets/renders/second-floor/  45 .jpg
assets/renders/third-floor/   54 .jpg
assets/renders/penthouse/     27 .jpg
```

File names are `<room>-<look>.<png|jpg>`. Every room has all 9 looks. Total is about 108 MB at full size (1536x1024 or 1024x1536), which is too heavy to ship.

Do this:

- Add a small script (for example `scripts/build-renders.mjs`, using `sharp`) that writes web copies to `assets/renders-web/<floor>/<room>-<look>.webp`, max 1600 px on the long edge, quality around 80. Expect roughly 150 to 250 KB each.
- Commit the web copies and import those from the app. Keep the full-size originals out of git (add `assets/renders/` to `.gitignore`) unless Jonathan says otherwise; they stay on his Mac.
- Use lazy loading on thumbnails. Every file must stay under Cloudflare Pages' 25 MB per-file limit, which the web copies easily do.

## Looks (9)

Show them in two groups, in this order.

| key | Name | Group | Swatch | Description |
|---|---|---|---|---|
| modern | Modern home | Modern, budget | #c9b79a | Engineered white oak, warm white paint, matte black hardware, stone-look porcelain, oak veneer cabinetry. |
| blackwalnut | Black & walnut | Modern, budget | #4a3326 | Crisp white walls, walnut cabinetry and furniture, matte black accents, graphic black and white tile. |
| sageclay | Sage & clay | Modern, budget | #8fa088 | Sage painted cabinets, terracotta and clay textiles, zellige-look tile, light oak, aged brass. |
| navybrass | Navy & brass | Modern, budget | #22314f | Navy cabinetry and accent walls, white oak, brushed brass, marble-look quartz. Tailored and classic. |
| scandi | Scandi light | Modern, budget | #e4e1da | All-white walls, pale ash and birch, light grey and oatmeal textiles. The brightest option. |
| aman | Aman warm minimal | Five-star hotel | #d8c6a6 | Pale oak, travertine, sand limewash plaster, bronze, linen. Quiet and spa-like. |
| rosewood | Rosewood dark moody | Five-star hotel | #2b211b | Smoked oak, black marble, brushed brass, velvet. Dramatic evening light. |
| parkhyatt | Park Hyatt Tokyo | Five-star hotel | #3c3a37 | Walnut, charcoal plaster, basalt, black steel, gallery lighting. Disciplined and masculine. |
| bulgari | Bulgari Italian | Five-star hotel | #b89a5e | Calacatta marble, dark eucalyptus wood, polished brass. Tailored glamour. |

## Rooms (19)

"Photo" is the model-home photo in `assets/Crown Georgetown Photos/` (add `.jpg.webp`). Portrait rooms use a 2:3 tile; everything else is 3:2.

### Entry level (`first-floor`)

| key | Name | Dims label | Photo | Portrait | Note |
|---|---|---|---|---|---|
| entry | Entrance gallery | Two-story, open to above | first-floor-entrance-gallery-and-spiral-staircase | yes | Facing glass double doors to the office and studio, the arch into the center hall, curved stair beyond, balcony overhead. The polka-dot wallpaper, cherry floor and white spindles go. |
| gym | Studio gym | 11'-11" x 13'-1" | first-floor-studio-room | no | Wine wall and ladder come out for a full mirror wall, rack and dumbbells. Rubber floor takes dropped weights; 9' ceiling means a wall-mount folding rack. |
| media | Media room | 15'-1" x 11'-1" | first-floor-media-room | no | Keeps the tray ceiling, street window and U-sectional. The right wall becomes the TV wall with in-ceiling or in-wall Sonos. |
| office | Home office | 15'-5" x 12'-11" | first-floor-home-office | no | Corner windows stay. The left wall becomes the full built-in the plan already shows as an option. |
| bath | Bath #3 | Full bath, approx. 6' x 9' | none | yes | No model-home photo; built from the plan. Vanity and toilet on the garage-side wall, corner shower with a bench. |

### Main level (`second-floor`)

| key | Name | Dims label | Photo | Note |
|---|---|---|---|---|
| great | Great room | Fireplace, balcony doors | second-floor-great-room | French doors to the balcony, linear gas fireplace and the high transom window stay. The fireplace surround is where each look spends its money. |
| kitchen | Kitchen | Waterfall island, 4 stools | second-floor-main-kitchen-2 | Same footprint and island. New cabinet fronts, counters, backsplash, hood and pendants; the appliances get replaced too. |
| dining | Formal dining | Seats eight | second-floor-formal-dining | Arched window and corner windows stay. Table, chandelier and sideboard change with each look. |
| sunroom | Sun room | Breakfast nook | second-floor-sun-room | Wraparound windows and the wall-oven column stay; the column gets new fronts to match the kitchen. |
| stair2 | Stair hall | Curved stair | second-floor-spiral-staircase | Same curved stair. New treads, handrail and balusters or paint, plus runner and lighting. |

### Bedroom level (`third-floor`)

| key | Name | Dims label | Photo | Note |
|---|---|---|---|---|
| ownerbed | Owner's bedroom | Row of windows | third-floor-master-bedroom | Window wall and bed wall stay; carpet comes out for wood in every look. |
| retreat | Owner's retreat | Coffee + wine bar | third-floor-master-bedroom-owners-retreat | The existing coffee bar with sink and wine fridge stays in place with new cabinets and counter. |
| ownerbath | Owner's bath | Tub, walk-in shower, double vanity | third-floor-master-bedroom-bath | Freestanding tub on the feature wall, glass shower, long double vanity. Heated floor in every look. |
| bed3 | Bedroom 3 | Corner windows | third-floor-bedroom-3 | Corner windows stay; the magenta valance and drapes go. |
| sharedbath | Shared bath | Jack-and-Jill, bedrooms 2 + 3 | third-floor-shared-bath-bedroom-2-3 | Double vanity between bedrooms 2 and 3. Heated floor planned here too. |
| laundry | Laundry | New washer + dryer | third-floor-laundry-room | Sink run and windows stay. New side-by-side front-loaders with a folding counter over them. |

### Penthouse (`penthouse`)

| key | Name | Dims label | Photo | Note |
|---|---|---|---|---|
| loft | Penthouse loft | Wet bar, terrace doors | fourth-floor-penthouse-loft | Tray ceiling, wet bar and both sets of terrace doors stay. |
| bed5 | Bedroom 5 | New build | fourth-floor-penthouse-bedroom-5 | 708 has no Bedroom 5 yet. The photo is the version Wormald built in the model home; the renders show how it could look once added. |
| terrace | Roof terrace | Pergola, fire feature | fourth-floor-outdoor-living-terrace-and-sun-terrace-3 | Pergola, railings and the fire wall stay. Each look translated into outdoor materials, with deck speakers planned. |

## First-floor cost table (Entry level only, Modern home look)

Caption: Finishes and built-ins, labor included, DC-area rough ranges. Excludes furniture being moved over, whole-house Sonos and Apple Home work, and gym equipment (about $4 to 8K). Get two or three contractor bids before treating any number as real. Hotel looks run roughly 2 to 3 times the Better column.

| Item | Good | Better |
|---|---|---|
| Floors, about 700 sq ft (gallery, halls, office, media) | Quality LVP, $4-5K | Engineered white oak, $7-10K |
| Wallpaper off, paint the whole floor incl. two-story gallery | One warm white, $5-7K | Plus a limewash accent wall, $7-9K |
| Stair and balcony | Paint spindles black, new oak handrail, $1.5-3K | New metal balusters, $6-10K |
| Lighting: gallery pendant, 2700K cans, dimmers, sconces | $3-5K | $6-9K |
| Studio gym: wine wall out, rubber floor, mirror wall | $3-4K | $4-6K |
| Media wall: floating console and shelves | Semi-custom or IKEA-based with oak fronts, $2-4K | Custom oak veneer, $6-10K |
| Office built-ins, about 13 ft wall | IKEA-based, painted, $3-6K | Custom painted cabinetry, $8-14K |
| Bath #3: porcelain tile, floating vanity, glass panel, new fixtures | Keep layout, $12-16K | Bigger tile, wall-hung toilet, niche, $18-25K |
| **First floor total** | **$34-50K** | **$62-93K** |

## Done means

- New branch, for example `feat/redesign-gallery`.
- `npm run typecheck`, `npm test` and `npm run build` pass. Add a unit test that every room/look pair resolves to an image (19 rooms x 9 looks = 171).
- Run `npm run test:e2e`. The visual snapshots in `tests/e2e/visual.spec.ts-snapshots/` cover the 3D views; update them only if this change actually moves them, and say so.
- Check it at phone width and in the dark theme if the app has one.
- Update `README.md` (the "Reference photos and blueprint" section) to mention the Redesigns tab and the render script.
- Do not push to `main`. Pushing to `main` deploys to Cloudflare through GitHub Actions, so leave the branch for Jonathan to review, or open a PR.

## Context to keep

- Decisions so far: the studio becomes a full gym (wine wall removed, floor takes dropped weights); Bath #3 is a full bath; heated floors in the third-floor baths; Sonos in every room plus the terraces.
- Jonathan has not picked a look yet. A later change might mark a "selected" look per room, so keep the data in one typed table that is easy to extend.
- The renders were AI-generated from descriptions of the model-home photos, not edits of them. Layout matches closely; details will not be exact.
