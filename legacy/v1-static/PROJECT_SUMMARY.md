# The City Home 3D — Project Summary

## What this is
An interactive 3D "digital twin" website of a real house Jonathan is purchasing: the **Wormald "City Home with Georgetown Package"** at Crown, Gaithersburg MD (resale; 4,882 sq ft + 879 sq ft outdoor, 4 levels). Built from the actual blueprints (PDF, traced by hand into feet-scale data) and 16 photos of the real exterior. Used for browsing the house and doing interior design: orbit the whole building, peel floors, walk inside first-person, and a full furniture layout editor.

**Everything is hand-modeled Three.js primitives + procedural canvas textures. No external 3D assets, no build step.**

## Running it
Static ES-modules site, served with `npx -y http-server city-home-3d -p 8123 -c-1 --silent` (a `.claude/launch.json` config named `city-home-3d` exists). Importmap points `three` → `./node_modules/three`. Debug API on `window.CH = { camera, orbit, setScene, lobby, editor, H, THREE, setFloor(f), view(px,py,pz,tx,ty,tz) }` (`view` is instant, no tween). Runtime errors surface in a `#err` overlay at the bottom of the page.

## File map
- `index.html` — all UI: left panel (floor buttons ALL/01–04, Day/Evening, lobby music, Seasons, Orbit/Walk + auto-orbit toggle + speed slider, Design section, layers), `#catalog` right drawer, `#styleBar` (bottom: finish/accent chips, Size row, modular-sofa Build row), `#roomBar` (top: floor + wall-paint chips, exit), `#dimHUD`, compass, `#err` overlay.
- `src/main.js` — renderer/scene/camera/lights, world wiring, floor peel (`applyFloor`), day/evening, walk mode (PointerLockControls, WASD, Q/E floor change), hover room tags, aerial auto-orbit (All view only, speed slider), garage tilt animation, chimney smoke, compass, audio wiring, editor UI wiring (catalog with rendered thumbnails, chips, layout slots UI), `CH` debug API.
- `data/house.js` — the entire traced house: `buildHouse(M,K)` returns `H = {levels[4], furn[4], ceilings[4], roof, site, optional, labels, evLights, floorPicks, tray, garageDoors, smoke}`. Helpers: `mkWall` (stamps `userData.wallId` for paint), `win/door/gdoor/arch`, `place()` (stamps stable furniture IDs), `evLight`, `roomFloor` (stamps `userData.room/.level/.srcFloorMat` on floor meshes → `floorPicks`), `elevatorCloset`.
- `src/parts.js` — geometry builders: `wall()` (segments+openings, 2-layer exterior brick/inner, trim sills/lintels, 1-over-1 window sashes, door leaves), `box/rect/slab/wedge`, main stair, guards, `voidOrbs`, spiral stair, railing, labels.
- `src/materials.js` — `makeMaterials()` → `M`: procedural canvas textures (white brick, oak, fieldstone, slate shingle, slats, pavers, siding…) + fabrics/metals. **ALL materials are DoubleSide** (required by the mirrored world).
- `src/furniture.js` — `makeFurnitureKit(M)` → `K`: ~55 parametric furniture factories. A wrapper loop stamps `userData.kind` on every factory's output — new kinds MUST be added before that wrapper.
- `src/landscape.js` — ground, streets, driveway to rear alley, fence with gate on the front-door axis, planting, facade uplights, sky domes, sun/moon/stars/clouds, neighbor house massings beyond the streets.
- `src/seasons.js` — leaves/petals/snow systems and holiday decoration sets (see Seasons below). New blocks are brace-scoped `{}` to avoid identifier collisions.
- `src/audio.js` — Web Audio: lobby piano-trio jazz, Jingle Bells (public-domain 1857), original D-minor Halloween waltz. Each track on its own GainNode bus, killed on stop so tracks never overlap. Defaults to lobby only; auto-start deferred 250 ms and guarded.
- `src/editor.js` — the layout editor (see Editor below).
- `PROJECT_SUMMARY.md` — this file.

## Coordinate system & mirroring (critical)
- Plan-space feet: x 0→31.6 (W), z 0→57.7 (D). Floor base heights `BASE=[0,11,22,32]`, ceilings `CEIL=[10,10,9,9]`, grade y=−1.5.
- The whole model was initially mirrored vs reality, fixed with **`world.scale.x = −1`** (plan x → world −x). Consequences: all materials DoubleSide; converting pointer/world coords into furniture space uses `parent.worldToLocal()`; normals via `transformDirection`.
- **Compass**: front door faces SOUTH = plan −x = world +x. NORTH = plan +x. EAST (street) = plan −z = world −z. WEST (rear alley/garage) = plan +z. A compass rose UI tracks the camera.

## House modeling highlights
- **Interior stair (redone 3×, per blueprint)**: NOT a spiral. Winder stair wrapping an OPEN WELL ("Open Above & Below"): 3 straight E→3 SE winders→6 N→2 NE winders→3 W discharge per flight; visible shaft with guard rails; you can see down through the well on every floor. Floor slabs have a stair hole (x 24.4–31, z 13.8–26.2).
- **Roof**: steep hip/mansard via a 4-radial-segment CylinderGeometry frustum trick, slate shingles, grand front pediment, sunburst **see-through oculus**, chimney with animated smoke.
- **Exterior matched to 16 photos**: white painted brick, cream cast-stone trim, bronze 1-over-1 windows, fieldstone watertable, bell-curved plum entry hood ("the cove") with coach lanterns, oak arched-lite front door, recessed entry vestibule with 3 stone treads, precise per-photo window rhythms on south & east facades (blind window, connected pairs, trio, inlay diamonds), rear brown board-and-batten + cream lap siding, wood garage doors that **tilt-tuck open via button** (3 coach sconces, empty garage).
- **Penthouse per blueprint**: wet-bar bump-out protruding onto the terrace, media wall, dining terrace with east-west slat canopy over the table, hanging lights, tall bushes at the west guardrail, one 6' door to the living terrace only.
- **Interior doors**: ALL interior door leaves removed (user request) — interior doorways are open openings. Front door, garage doors, and bronze elevator sliders remain.
- **Ceiling decor** (great-room oak beams, sunroom T&G ceiling, suite slat canopy) lives in `H.ceilings[level]`, hidden when that floor is peeled open, shown in All view and walk mode.

## Scenes, seasons, audio
- Day/Evening scenes (warm interior evening lights via `evLights`).
- Seasons: Summer (baseline), Spring (cherry blossoms), Fall (colored leaves + **Halloween mode**: graveyards N+S, witch, skeletons incl. a GIANT ~15' one, Frankenstein, giant spider, 12 webs, pumpkins, ghosts, orange/purple lights, original spooky waltz), Winter (bare trees, snow cover, Snowing toggle, **Christmas mode**: auto-snow, 360° red/green flashing bulb strings, 3 outdoor trees + indoor great-room tree, inflatable snowman/Santa/reindeer, rooftop sleigh, wreaths, candy canes, floods, Jingle Bells).
- Music rules: never overlaps (per-track gain bus killed on stop), defaults to lobby jazz. **Copyright constraint honored: refused to reproduce "This Is Halloween" (Danny Elfman); only public-domain or original compositions.**

## Layout editor (the big feature, v2.5)
Activated ONLY by the **✎ Edit layout** button (auto-enable on room-click was added then reverted — browsing clicks must never move furniture).

- **Select/drag** with 6" grid snap (Alt = free), **R**/**,**/**.** rotate 45°/15°, **F** mirror-flip, **D** duplicate, arrows nudge (camera-relative), **PgUp/PgDn** raise/lower, **⌫** delete (catalog items removed; blueprint items hidden), **Ctrl-Z** undo (60-deep JSON snapshots), **Esc** backs out (paint→pending→selection→room).
- **Alt-click** cycles to the piece underneath (rug under a sofa).
- **Occlusion-safe picking**: in All view, walls/slabs/roof block the pick ray (no grabbing furniture through floors). In a floor view, candidates are that floor only and same-floor walls don't block bird's-eye clicks.
- **Catalog** (`+ Add`): ~66 entries in categories (Chairs, Sofas & Seating, Tables, Bedroom, TV & Media, Lighting incl. 3 fancy chandeliers, Kitchen & Bath, Walls & Windows, Plants & Decor), each with a **live-rendered 3D thumbnail** (offscreen renderer, generated on first open). Click-to-place with a translucent **ghost preview** following the cursor; Shift keeps placing.
- **Wall-mount placement**: art, TVs, mirrors, drapes, consoles, sideboards, built-ins, cabinet runs mount flush onto **the wall or window you click** (standoff + rotation from the face normal, hang height from click height; `WALL_KINDS` map).
- **Per-piece finishes**: primary + accent material slots (auto-detected top-2 materials, WeakMap-based so clones are safe), 19 finish swatches.
- **Universal resize**: Size row on every piece — ⤡−/⤢+ scales W+D together (keeps footprint shape), W±/D±/H± per-axis (piece-local axes), 1:1 reset. ±10% steps, clamped 0.4–3×.
- **Modular sofa** (`modSofa`): chain of modules (seat/chaise/corner/ottoman) with Build row buttons + module W/D sizing; a bobbing gold ▼ marker shows the append end; **⇄ End** flips which end modules add to (leading-corner inserts auto-counter-rotate so the built run keeps its world orientation).
- **Rooms**: double-click a room → fitted bird's-eye camera anchor + `#roomBar` with per-room **flooring** swatches (7) and per-side **wall paint** (12 designer colors; thin paint coats added per wall segment on the clicked side only, openings preserved; hatched chip unpaints). Exit via button/Esc.
- **Dims HUD** while a piece is selected/dragged: footprint in feet-inches + live N/S/E/W clearance raycasts.
- **Persistence**: everything in `localStorage 'cityhome-layout-v2'` as `{edits:{id:{x,z,y,rot,flip,sx,sy,sz,hidden,mat,accent}}, added:[entries], rooms:{'level|name':{floor}}, walls:{'wallId|±':{paint,src}}}` — an override layer on top of the intact blueprint layout. Blueprint pieces get stable IDs (`level|kind|x,z` stamped by `place()`); catalog items get `aid`s. Named **layout slots** (save/load/delete), plus JSON **Export/Import**. Reset floor clears one floor.
- **Grand piano** rebuilt with a real rim silhouette (ExtrudeGeometry: straight bass side, round tail, S-waist), propped lid, baby-grand size (~3'11" wide).

## Conventions & invariants (do not break)
1. **Jonathan's in-app layouts are the source of truth** — avoid repositioning furniture in code; ID changes orphan his overrides. Suggest he Export before code-side furniture changes.
2. New furniture kinds go in `furniture.js` BEFORE the kind-stamping wrapper loop.
3. All new materials DoubleSide; anything added under `world` must tolerate `scale.x=−1`.
4. `meta`/user preference: present as **"Marta," a design-tools engineer persona**; ask clarifying questions (AskUserQuestion) before big builds.
5. Wormald blueprints are copyrighted — personal use only. No copyrighted music.

## Testing gotchas (for automated verification)
- Drive the app via `CH`; check `#err` overlay text after loads.
- Synthetic PointerEvents make OrbitControls throw a harmless `setPointerCapture` NotFoundError into `#err` — clear it; real mice are unaffected.
- When the browser pane is hidden, rAF pauses → newly spawned objects would have stale matrixWorld (spawn now calls `updateMatrixWorld(true)` as hardening; still, front the pane/screenshot before click tests).
- Aerial auto-orbit rotates the camera between computing a pixel and dispatching a click — disable it or use a floor view for scripted clicks.
- A zero-size pane gives camera aspect NaN — `dispatchEvent(new Event('resize'))` after the pane is visible.

## Deferred / backlog ideas
- Room templates (one-click furnish in master-plan styles), copy-style eyedropper, overlap warnings, printable top-down 2D plan export with dimensions, "reverse chain" native both-end sofa growth (⇄ End covers it), wall-paint UI outside room focus.
