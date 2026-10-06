# Render accuracy audit — all 171 renders vs model-home photos + blueprint

Audited 2026-10-06. Every render in `assets/renders/` was compared against its model-home photo in
`assets/Crown Georgetown Photos/` and the blueprint (`assets/cf_city_home_with_georgetown_pkg.pdf`).
Only **architecture/geometry** was judged — windows, doors, fireplaces, stairs, ceilings, room size,
camera angle, and the view outside. Finish/furniture changes per look are by design and were not flagged.

## Verdict

**Roughly 12% of renders are architecturally faithful (20/171), 40% are outright wrong (68), and the
rest have minor but visible drift (83).** The renders were generated from *text descriptions* of the
photos, and it shows: the model invented plausible-generic rooms instead of these rooms.

### The five systematic failures (fix these in the generation process, not per image)

1. **Wrong world outside the glass.** ~90% of renders show countryside, forest, mountains, ocean, or
   big-city high-rises. One has Tokyo Tower. The real views are Crown, Gaithersburg: brick/mansard
   townhomes across the street, iron fences, street trees and lamps; from upper floors and the roof,
   neighboring townhome rooftops plus mid-rise apartment blocks.
2. **Windows redrawn.** Counts, sizes, and positions drift everywhere: the great room loses its left
   transom in all 9; the owner's bedroom's single mulled 4-sash group becomes 3 separate windows; the
   office's oversized corner units shrink to small singles; the dining room drops from 5 windows to 4;
   bedrooms gain windows on walls that are blank in reality (Bed 5).
3. **Rooms inflated.** Small rooms (gym 11'11"×13'1", laundry 8'3"×10'4", Bath #3 ~6'×9', Bed 3
   10'8"×12'4") render far larger than the plan, especially in the hotel looks.
4. **Invented ceiling features.** The hotel looks (aman, rosewood, parkhyatt) repeatedly add cove/tray
   dropped-ceiling bands to rooms with flat ceilings.
5. **Fixed architecture moved or deleted.** Kitchen wall-oven column deleted in 9/9 (while the sunroom
   renders keep it — adjacent rooms contradict each other); laundry plan rotated 90° in 9/9; Bed 3's
   bed moved off its true wall in 9/9; stair hall loses the open well's down-flight in 9/9; terrace
   fireplace leaves its shiplap privacy wall in 9/9.

### Reliability by look

Budget looks track the architecture far better than hotel looks.
Most faithful → least: **scandi, navybrass, modern, blackwalnut, sageclay** · then **bulgari, rosewood, aman, parkhyatt**
(the hotel looks keep re-imagining the building itself: curtain walls, skylines, coves, hotel-scale rooms).

### Scoreboard (per room: OK / MINOR / WRONG out of 9)

| Floor | Room | OK | MINOR | WRONG | Redo? |
|---|---|---|---|---|---|
| Entry | Entrance gallery | 1 | 7 | 1 | touch-up |
| Entry | Studio gym | 0 | 6 | 3 | **redo** |
| Entry | Media room | 6 | 3 | 0 | keep-ish |
| Entry | Home office | 0 | 9 | 0 | redo (same fix ×9) |
| Entry | Bath #3 | 2 | 6 | 1 | touch-up |
| Main | Great room | 0 | 0 | **9** | **full redo** |
| Main | Kitchen | 0 | 0 | **9** | **full redo** |
| Main | Formal dining | 0 | 6 | 3 | redo |
| Main | Sun room | 2 | 7 | 0 | touch-up |
| Main | Stair hall | 0 | 4 | 5 | **redo** |
| Bedroom | Owner's bedroom | 0 | 6 | 3 | redo |
| Bedroom | Owner's retreat | 0 | 6 | 3 | redo |
| Bedroom | Owner's bath | 0 | 9 | 0 | touch-up (2 window fixes) |
| Bedroom | Bedroom 3 | 0 | 0 | **9** | **full redo** |
| Bedroom | Shared bath | 6 | 3 | 0 | keep |
| Bedroom | Laundry | 0 | 0 | **9** | **full redo** |
| Penthouse | Loft | 2 | 5 | 2 | redo |
| Penthouse | Bedroom 5 | 1 | 4 | 4 | redo |
| Penthouse | Roof terrace | 0 | 2 | **7** | **full redo** |

Worst first (regeneration priority): **great room, kitchen, Bed 3, laundry, roof terrace**, then
stair hall, dining, owner's bedroom/retreat, Bed 5, gym, office, loft — then the touch-up rooms.
Shared bath, media room, and Bath #3 are usable as-is if you want to stage the work.

## How to regenerate so this doesn't happen again

The root cause is text-only generation. For round two:

1. **Give the image model the actual photo as an image input** (image-to-image / "restyle" / structure-
   conditioned edit at low strength), with the instruction: *change only finishes, furniture, and decor
   for the look; keep every wall, window, door, ceiling, and the camera exactly as the photo.* That one
   change eliminates failures 1–5 for the 18 photographed rooms.
2. For **Bath #3** (no photo), generate from the spec below and reuse the best current render
   (`modern` or `navybrass`) as the structural reference for the other looks.
3. **Owner-decision overrides** (deviate from the photo on purpose): TV mounted **above** the great-room
   fireplace; gym mirror wall + wall-mount folding rack; media TV on the right wall; office left-wall
   built-in; new laundry machines; wood floors replacing carpet.
4. QA each batch against the checklist in its room spec before accepting.

## Per-room regeneration specs

Paste the common block plus the room block into the image tool. **Common block:**

> Setting: a 4-story brick townhouse at Crown, Gaithersburg MD (urban planned neighborhood).
> Use the attached model-home photo as the structural reference. Keep the camera position, lens, and
> every architectural element exactly as photographed: same walls, same window count/size/placement,
> same doors, same ceiling (flat unless the photo shows a tray), same room proportions. Views through
> any window or door: a townhouse streetscape — brick and mansard-roof townhomes, iron fences, street
> trees, streetlamps; upper floors see neighboring rooftops and mid-rise apartment blocks. Never
> countryside, forest, mountains, ocean, or skyscraper skyline. Change only finishes, furniture,
> fixtures, and decor to match the look. Do not add cove or tray ceilings, do not enlarge windows,
> do not resize the room.

### Entry level

- **Entrance gallery** — two-story gallery, balcony overlook above with white balusters and dark rail;
  **single-lite** glass double doors on both side walls (not divided-lite); arched opening to the center
  hall; traditional curved stair against the wall with a **modest double-hung window at the landing —
  not a two-story feature window**. Camera at the front door looking down the gallery.
- **Studio gym** — 11'11"×13'1" corner room, 9' ceiling. **Near-wall-wide mullioned window unit on the
  left wall AND a second window wall** (corner room per plan), street view. Mirror wall where the wine
  wall was, wall-mounted folding rack, rubber floor. Do not enlarge the room.
- **Media room** — 15'1"×11'1"; keep tray ceiling and the **wide two-sash** double-hung offset right on
  the street wall (not a narrow centered single); TV on the right wall; urban street view.
- **Home office** — 15'5"×12'11", camera on the corner diagonal like the photo. **Two-unit-wide window
  on the front wall and three-unit-wide window on the right wall with the built-in counter beneath it**;
  full built-in on the left wall; corner-street view. Do not shrink the windows.
- **Bath #3** — ~6'×9' interior full bath, **no window**. Vanity and toilet on the same (garage-side)
  wall, corner shower with bench. Keep it compact.

### Main level

- **Great room** — 15'1"×17'0", camera from the front-left corner. Left wall: wide glass French/sliding
  terrace doors **with a transom above**. Fireplace wall: chase centered with **even wall space left and
  right; TWO high transom windows, one on each side of the fireplace** (plan labels "High Window" both
  sides); linear gas insert; **TV mounted above the fireplace** (owner's change vs the photo); crown
  molding, flat ceiling.
- **Kitchen** — keep the L-run exactly: window over the left counter; cooktop + chimney hood centered on
  the back wall flanked by glass-front uppers; **stainless wall-oven + microwave column at the right end
  of the back wall — it must stay** (new fronts per look OK); waterfall island parallel to the back wall
  with 4 stools on its right side; **arched** openings to adjacent rooms; breakfast nook beyond right.
- **Formal dining** — 12'11"×15'3". Five windows: left wall **one small high arched-top window** (small —
  do not enlarge); far corner **two adjacent tall rectangular double-hungs**; right wall **two tall
  arched-top windows plus an arched niche**. Crown molding, flat ceiling.
- **Sun room** — 12'3"×9'3"; wall-oven column at the left edge stays; **wraparound double-hung windows
  with transoms above a knee wall** (not floor-to-ceiling glazing) on the far and right sides; round
  pedestal table.
- **Stair hall** — the curved stair sweeps continuously from the first tread (no straight lower run);
  **open well: the guard rail in the foreground wraps a stairwell continuing DOWN** (open above and
  below), not a balcony; arched opening to the great room on the left; tall stacked windows on the
  stair wall; paneled door under the stair.

### Bedroom level

- **Owner's bedroom** — rear wall: **one wide mulled group of four gridded double-hung sashes** (not
  three separate windows) with dresser beneath; bed on the right wall; flat ceiling; dusk urban view.
- **Owner's retreat** — 12'3"×10'0", open pass-through from the bedroom (no door); coffee/wine bar with
  sink + wine fridge stays in place; **white double-hung corner windows on two walls** (not black
  full-height glazing); the terrace-side **French door is an operable door**, not a fixed pane.
- **Owner's bath** — 14'8"×18'6"; glass shower left foreground **with its window inside the shower
  enclosure on the left wall**; freestanding tub on the far feature wall; long double vanity right
  **with a window on the right wall beside the vanity** (missing in all current renders); flat ceiling.
- **Bedroom 3** — 10'8"×12'4". **Bed headboard on the RIGHT wall between its two sheer-covered
  windows**; large white two-sash window on the left/front wall with a clear street view (road, iron
  fence, neighboring townhomes). **Three** window openings total. Do not enlarge the room.
- **Shared bath** — current renders are correct; if regenerating: 8'1" wide Jack-and-Jill, double vanity
  right under a wide mirror, doors at both ends, no window.
- **Laundry** — 8'3"×10'4". **Sink run with granite top and uppers along the LEFT wall, with BOTH
  windows on that wall (arched-top sash over the sink + a taller rectangular one beyond)**; machines on
  the right wall with **no window above them**. Camera from the door looking down the counter. Do not
  rotate the plan or widen the room.

### Penthouse

- **Loft** — 23'10"×16'6", raised tray ceiling (11'6"). Left wall rhythm: **single window — divided-lite
  French terrace doors — single window**. Right wall: **full-width multi-panel sliding glass** onto the
  pergola terrace. Rear: **recessed wet-bar ALCOVE (9'3"×6'10")** with bar counter, two pendants, and a
  small window — not a full-wall kitchenette. Rooftop view of Crown townhomes/mid-rises.
- **Bedroom 5** — 14'11"×11'1", **flat** 9'6" ceiling. Bed on the left wall; **headboard wall and far
  wall are windowless** (a normal window on the unseen camera-side wall is acceptable); swing door near
  the far-right corner; dresser on the right wall. No floor-to-ceiling glazing, no tray/cove, no
  skyline.
- **Roof terrace** — pergola with string lights and shade sails over the dining zone; dark metal picket
  railings (vertical pickets). **The linear gas fireplace sits in the 60"-high white shiplap privacy
  wall on the house side with art above it** — not in a parapet at the view edge, never a fire pit.
  Beyond the railings: **adjacent brick/mansard townhome rooftops close by plus mid-rise apartment
  blocks** — the real Crown roofscape.

## Notable one-offs worth laughing at, then fixing

Tokyo Tower in the loft (parkhyatt); open ocean with Mediterranean villas from the roof terrace
(bulgari); a Manhattan night skyline through an 11-foot-wide bedroom (rosewood bed5); the entry stair
rebuilt as a freestanding sculptural plaster ribbon (aman).
