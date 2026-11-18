# Ankle UI and interactive performance

2026-11-17–18, local `feat/ankle-phase1`. No publication.

## UI

- Muscles/tendons initially ON. Ligaments initially Fade.
- Retinacula initially Fade, controlled independently beside Axes. Ankle
  ligament presets and individual ligament rows exclude retinacula. Hover names
  remain available.
- Muscle action groups stay visible outside the individual-muscle accordion.
  The common Hip/Knee/Ankle panel uses the same layout; opening individual
  muscles does not reveal or hide the action group controls.

## Cause and replacement

The previous frame path repeatedly solved bone exclusion, ligament routing,
muscle-to-ligament contact and retinaculum coverage on the UI thread. The long
frame also hit the animation time-step cap, making playback appear unusually
slow as well as delaying input. Increasing playback speed would not fix this.

The four approved ankle controls each have a single angular degree of freedom.
Their contact-resolved geometry is now generated ahead of time at 0.5-degree
knots over every supported range. Runtime interpolation updates vertex arrays;
it avoids the previous whole-tissue bone exclusion/routing pass. Exact bone rotations, terminal bone
footprints and the length-preserving free Achilles transform are still evaluated
at the actual displayed angle. Display normals and conservative motion bounds are also cached; only locally corrected regions recompute normals.

The offline pass also records only the vertices and triangles that may contact a deep ligament over the supported motions. Runtime checks this small candidate set to preserve clearance between angle knots. Retinaculum coverage runs in a module worker over cropped distal tendon sheets. Requests are coalesced to the latest pose and obsolete results are discarded; bone following and all terminal footprints remain synchronous. Only the small clearance correction is blended in as the worker returns it. Local bone checks cover substantial clearance changes and coarse upper-gastrocnemius triangle interiors that already overlap the source tibial envelope. These are free-body contact constraints, not added muscle attachments. The usual source-relative teaching gaps are retained. Collision-sheet footprints are expanded by 0.5 mm only while collecting conservative candidate masks, never in the rendered anatomy.

The compressed position data uses a shared Float32 neutral pose and 16-bit temporal
deltas. `quantum` in cache.json specifies positional quantization. Exact
footprints and the free Achilles are reconstructed after interpolation. A separate 8-bit temporal-delta normal table avoids a whole-mesh normal rebuild every frame.
Hip/Knee do not load the ankle data until Ankle is requested.

The approved PTFL temporal filter remains active for large route changes, with a 15-mm/s route adjustment limit and exact exterior checks. Ordinary small cached steps use no extra route solve. This preserves smooth motion rather than exposing coarse solver route changes.

## Rebuild

Run the local server, then:

```
node scripts/build-ankle-motion-cache.mjs
```

Keep `cache.json`, `positions.bin.gz`, `normals.bin.gz` and NOTICE together. Metadata records
source hashes and compressed-data checksums; explicitly recorded compatible runtime refactors retain the same offline geometry/candidate semantics. The unit check detects stale or
incomplete geometry. Regenerate after changing the source models, approved axes,
ranges, routes, attachments or contact rules. This lookup applies to the current
four individual controls; it is not an arbitrary simultaneous multi-joint
physics solver, muscle force model or measured ligament strain.

## Verification

- `ANKLE_PERFORMANCE_BEFORE.json` / `ANKLE_PERFORMANCE_AFTER.json`: same local
  Edge/SwiftShader benchmark, frame work and input-to-frame latency. Regression budgets are 25 ms median geometry work, 35 ms median CPU frame work and 100 ms P95 input-to-frame latency. These are CPU/input budgets, not a claim of 60 FPS with software rendering.
- `ANKLE_CACHE_VERIFICATION.json`: independent retinaculum controls, initial
  opacity, persistent group buttons, and off-grid intermediate angles.
- Muscle/Achilles, tissue layering and PTFL continuity scripts remain applicable.
- Bone QA uses five-direction parity to avoid single-ray edge-grazing sign
  changes. Layer QA ignores only five-micron silhouette ambiguity, separately
  from penetration-depth limits. Neither QA rule changes rendered geometry.
- Shared Hip/Knee UI and existing unit tests check regressions.

Final local benchmark: median geometry work 22.2 ms (previous exact frame path: 255.9 ms); median CPU frame work 27.8 ms (514.6 ms); P95 input-to-frame 72.8 ms (703.6 ms). Unit checks: 62 passed. Shared UI: 2 passed. Muscle/Achilles: 12 poses. Off-grid geometry: 17 poses. PTFL: 240 frames, maximum route correction step 0.7501 mm, terminal error below 0.00001 mm. Public main and protected repositories were not updated.
