# September 11 reference reconstruction

## Sources and decisions

Reviewed all 27 images in `assets/Crown Georgetown Photos`, all 16 labeled JPEGs
in `assets/Outside Photos`, and all four PDF pages in
`assets/cf_city_home_with_georgetown_pkg.pdf`. The PDF cover/model-home photograph
shows brown brick. The actual exterior photographs show the white painted-brick
house and govern the exterior materials and elevations. The user confirmed that
the interior photographs and plans describe the same layout, and requested the
photographed furniture arrangement as the new default.

The marketing plans print room dimensions but do not dimension every wall,
stair width, landing, roof pitch, or elevation. Those details remain proportional
traces and photographic estimates, not measured construction drawings. Printed
room dimensions remain separately recorded in `SOURCE_DIMENSIONS`; irregular
finished regions are explicit polygons rather than falsely enlarged rectangles.

## Corrections

- Stair core: a quarter-turn lower flight, half-story landing at 5.5/5.5/5 feet
  above each departure floor, and a straight upper flight across the back of the
  well. Equal rises, dark tread nosings, continuous curved handrail, white
  pickets/newels, and open space beneath the plaster soffit. The upper-flight
  exit remains open at each floor. No ornamental pendant stack through the well.
- Entry: gallery flooring starts behind the recessed portico. The studio,
  bathroom/shower, rear hall, and divided mechanical/service area are connected
  in the plan sequence. The office rug and media sectional follow the photos.
- Main: island, stools, pendants and formal dining table share their intended
  long axes. The island has an actual sink opening and faucet. Great-room
  seating faces the sofa/fireplace arrangement in the photograph.
- Penthouse: projecting central bedroom, inset closet and bathroom, open loft,
  wet bar beside the loft, and a full dining terrace behind the wet bar. The old
  wet-bar extension into the terrace has been removed. Back-to-back gray seating,
  yellow tables/chairs, purple chaises, open woven pod chair, pergola, shade sail,
  and fireplace follow the room and terrace photographs.
- Exterior: inhabited mansard around the fourth story, projecting south/east
  dormers, layered dark cornices and pediments, white masonry and cast-stone
  details. Rear lap siding/paneling and the open rooftop pergola are based on the
  actual rear photographs. Slim iron fence posts replace invented masonry piers
  on the street sides.
- Finish detail: deeper window frames and divided sashes, cast-stone eyebrow
  lintels, arched interior openings, crown/skirting/casings, patterned rugs and
  upholstery, folded curtains, casework fronts and hardware, stainless sink,
  woven chair geometry, and correctly elevated rugs.

## Defaults and recovery

Detailed graphics is the default; Smooth and Balanced remain available.
On the first load of this model revision the app starts the reference arrangement.
The previous browser document is retained verbatim under
`cityhome-layout-before-reference-2026-09`. It can be recovered as JSON and imported
through the editor. The one-time revision marker prevents subsequent furniture
edits from being reset. Existing named layout slots are left intact.

## Verification

Geometry checks cover equal stair rises, half-height landings, clear core bounds,
room/terrace separation, and source dimensions. The layout test checks backup and
one-time reset behavior. Browser visual coverage includes all four floor peels,
front and rear roof views, a close stair/landing view, and an eye-level terrace
view on desktop and mobile. Walk mode retains the full enclosure and hides
floating room labels; orbit mode peels the building and its external stair flights
together. Visual comparison remains necessary: tests alone do
not establish agreement with photographs.
