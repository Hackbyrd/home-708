# Generation brief: 5 new design looks × 19 rooms (95 renders)

For the image-generation session that produces the next render batch. Written 2026-10-06.

## Process (non-negotiable, learned from round one)

1. **Image-to-image, not text-to-image.** Use the room's model-home photo from
   `assets/Crown Georgetown Photos/` as the structural reference (restyle / structure-conditioned edit,
   low strength). Round one was text-only and ~40% of renders broke the architecture — see
   `docs/render-audit.md` for the full autopsy.
2. Apply the **common block** and the **per-room architecture spec** from `docs/render-audit.md`
   (they pin the camera, window counts, fireplace geometry, views of Crown, and the owner's overrides
   like TV-above-fireplace). Bath #3 has no photo — generate from its spec, then reuse the best result
   as the structural reference for the other looks.
3. File naming: `assets/renders/<floor>/<room>-<look>.png|jpg` with the look keys below
   (`heritage`, `paris`, `crownloft`, `canyon`, `deco`). Then run `npm run build:renders`.
4. Change ONLY finishes, furniture, fixtures, lighting and decor. Never the architecture.

## Look blocks

Append exactly one of these to each room prompt.

### heritage — Georgetown Heritage
> Style: young Washington-DC rowhouse traditional. Full-height paint-grade wall paneling and wainscot
> painted deep racing green (#2f4538) in principal rooms; cream plaster-look walls elsewhere. Dark
> herringbone oak floors. Unlacquered brass hardware, lighting and plumbing with visible patina.
> Oxblood and cognac leather seating, wool and tartan-adjacent textiles, roman shades. Traditional
> picture lights and black-shaded lamps. Mood: library-den warmth, established, bookish, a drink by
> the fire.
Room notes: kitchen = green painted cabinets, brass, honed black or soapstone-look counters; great
room = green paneled fireplace wall, TV above fireplace in a brass-trimmed niche; baths = cream +
green with unlacquered brass; terrace = green-black metal furniture, heritage lanterns.

### paris — Paris Apartment
> Style: Haussmann-apartment modern. White walls (#ede7db) with applied rectangular wall mouldings and
> panels, simple cove or stepped crown. Chevron white-oak floors. Curved, soft furniture in bouclé and
> ivory linen; marble bistro-style tables. Plaster chandeliers and sconces, antique brass, aged café
> mirrors. Sculptural art, books, minimal color beyond wood, white, black steel accents. Mood:
> effortless, romantic, Sunday-morning light.
Room notes: kitchen = ivory flat-panel cabinets with brass rail pulls, marble-look counters and a
plaster hood; dining = oval table, plaster chandelier; baths = white marble-look, nickel or brass;
stair hall = moulding panels following the curve.

### crownloft — Crown Loft
> Style: converted-warehouse loft in a brick townhouse. Blackened-steel accents and steel-framed
> interior glazing; one thin-brick feature wall per principal room (reclaimed red-brown brick).
> Walnut slab counters and shelves, concrete-look surfaces, charcoal walls in media and bar zones.
> Cognac leather seating, matte black plumbing, factory cage and articulated-arm lighting, Edison
> warmth. Mood: urban, unfussy, records-and-espresso, a little rock and roll.
Room notes: kitchen = flat charcoal cabinets, walnut island top, steel open shelving; great room =
brick fireplace wall with steel mantel shelf, TV above; gym = brick + steel + black rubber; terrace =
blackened steel planters and furniture, café string lights (already present).

### canyon — Canyon Modern
> Style: high-desert modern. Hand-troweled warm plaster walls (sand #d9c3a5 base) with rust (#c06b43)
> and ochre accents; arched niches where openings already exist. Travertine and unfilled limestone
> surfaces, black-stained oak floors and shelving as the dark anchor. Woven leather, rust velvet, sand
> linen, chunky wool. Oversized pottery, dried botanicals, sculptural plaster pendants. Warm
> golden-hour light. Mood: grounded, vacation-every-day, Palm Springs/Sedona.
Room notes: kitchen = plaster hood, travertine island, black-oak lowers + plaster uppers; great room
= full plaster fireplace mass, TV above in a shadow recess; baths = tadelakt-look plaster + stone;
terrace = terracotta pots, desert planting in containers, rust cushions.

### deco — Jewel Box Deco
> Style: Art-Deco revival. Emerald (#0f5c4e) and oxblood velvet upholstery; fluted walnut and burl
> veneer millwork; polished brass inlays, reeded glass; black and white graphic marble floors at entry
> moments; bold geometric rugs. Globe, fan and tiered lighting in brass + opal glass. Dark lacquered
> accents. Mood: celebratory, dressed-up, cocktail-hour theater.
Room notes: entry = checkerboard or sunburst marble floor, globe pendant run; kitchen = fluted walnut
island front, brass inlay, black marble-look counters; dining = burl table, fan sconces; loft = full
cocktail-bar treatment at the wet bar alcove; bedrooms = calmer: velvet headboards, brass, soft rugs.

## QA checklist per batch (reject the render if any fails)

- Window/door count and positions match the photo and `render-audit.md` spec
- Camera matches the photo's viewpoint
- View outside = Crown streetscape / rooftops (never countryside, ocean, skyline canyon)
- Room proportions match the plan dims; no invented tray/cove ceilings
- Great room: two high transoms flanking the fireplace, TV above fireplace
- Kitchen: wall-oven column present at the right end of the back wall
- Laundry: sink + both windows on the LEFT wall; Bed 3: bed on the RIGHT wall between its windows
