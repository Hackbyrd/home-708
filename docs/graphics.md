# Graphics implementation

The production app is Vue in `apps/web`. Its Three.js controller lives in
`packages/scene/src/controller.ts`; it imports the procedural model from the root
`src` and `data` directories. `legacy/v1-static` is the frozen original.

The reference reconstruction is documented in [reference-reconstruction.md](reference-reconstruction.md). It corrects geometry and the default furniture arrangement while preserving the mirrored coordinate system and editor support.

- `src/architecture.js` builds the photographed mansard, dormers, pediments and cast-stone lintels.
- `src/surfaces.js` builds seeded color and separate linear-space bump textures
  for brick, slate, fieldstone, wood, woven cloth, leather and tile. Geometry UVs
  are in feet; repeat density belongs to the material, including when the editor
  changes finishes. Shared samples avoid per-object texture allocations.
- `src/furniture.js` adds eased casework edges, cushion welting, pillows, framed
  cabinet doors, drawer fronts, handles, burners, appliance controls, open ceramic
  tub/basin shells and branching indoor plants. Factories retain existing kinds.
- `src/botanical.js` generates folded leaf geometry and seeded instanced crowns.
  Outdoor trees have trunks, limbs and twigs. Foliage uses the existing seasonal
  materials and visibility lists, including bare winter branches. Snow cover
  follows floor peels so hidden roofs do not leave floating white surfaces.
- `packages/scene/src/pbr.ts` supplies local image-based lighting, restrained
  bloom and antialiasing. Detailed mode adds contact-scale ambient occlusion.
  Switched-off evening fixtures are excluded from daytime light calculations.
  Composer dimensions follow the renderer's effective pixel ratio; all passes
  release their GPU resources when switching presets or disposing the scene.

The Graphics selector offers Smooth (direct rendering, no shadows), Balanced
(2048-pixel shadows, bloom and FXAA), and Detailed (4096-pixel shadows, SSAO,
bloom and FXAA). Detailed is the default. Adaptive resolution continues
to reduce pixel density under load. Detailed costs more GPU time, especially
on a high-density display. All modes share the enhanced geometry and materials.

No remote models, textures or new runtime dependencies are needed. Mirrors use
the local environment map, and glass uses transparent physical materials;
neither is a ray-traced reflection of the actual room.

Verification: `npm run typecheck`, `npm test`, `npm run test -w @city-home/scene`,
`npm run build`, and `npm run test:e2e`. Review visual baseline changes after
intentional graphics edits. New procedural modules must also be listed in
`packages/scene/scripts/build.mjs` so production includes them.
