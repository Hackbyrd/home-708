# v1 to v2 parity checklist

The rewrite is accepted only when these behaviors remain available.

## Browse

- Four individual floor peels and the complete-house view
- Day and evening lighting
- Summer, spring, fall, and winter environments
- Snow, Christmas, and Halloween modes with non-overlapping audio
- Orbit, auto-orbit speed, first-person walk, and floor changes while walking
- Room labels and hover names, furniture visibility, optional spiral stair
- Animated garage doors, chimney smoke, compass, responsive resize

## Edit

- Explicit edit-mode entry; browsing never moves furniture
- Selection, occlusion-safe picking, under-item cycling, drag and grid snap
- Rotation, flip, duplicate, nudge, raise/lower, remove, and 60-step undo
- Full furniture catalog with lazy thumbnails and wall-mounted placement
- Primary/accent finishes, universal sizing, and modular-sofa construction
- Room focus, flooring, per-side wall paint, dimensions, and clearances
- Reset by floor, named layouts, JSON import/export, legacy v1/v2 migration

## Persistence and access

- Anonymous users can read layouts and use all browse controls
- Anonymous mutation requests return 401
- Owner login enables editing and server-backed save/load/delete
- A local recovery draft survives transient failures without outranking server data
- Existing stable furniture and wall IDs resolve after migration
