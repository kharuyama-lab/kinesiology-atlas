# Hip restoration and shared knee muscles — 2026-11-02

## Changes

- Hip now uses the common scene and controls for flexion/extension (−20–110°), abduction/adduction (−25–45°) and rotation (−45–45°). Signs, ranges, 42°/s Auto speed, muscle identity colors, qualitative action coefficients and ligament presentation were ported from the local `legacy/hip/index.html` reference. No iframe, second loader or duplicate muscle meshes.
- Hip and Knee keep separate remembered motion values. Mode switches preserve focus, camera, tissue visibility and current motion; Whole Body explicitly resets the joint values. Auto remains immediately left of Reset pose.
- Hip content is no longer hidden by the knee/ligament review URL. Bone ON/Fade/OFF is available at Hip as well.
- Knee displays quadriceps, hamstrings, sartorius, gracilis, popliteus and both gastrocnemius heads. Rectus femoris, long-head biceps, semitendinosus, semimembranosus, sartorius and gracilis are the same registered meshes at Hip and Knee. TFL and the iliotibial tract are shared where relevant.
- Restored source nodes `Tensor fasciae latae.r`, `(Adductor minimus).r`, `Iliotibial tract.r`; the parentheses in the actual adductor minimus GLB name matter. The tract is fascia, listed in the existing muscle/fascia source group; it has no contraction coefficient.
- Muscle follower includes tibial sliding and the separate patellar transform for quadriceps insertions. Longitudinal endpoint regions constrain the existing visual skinning; source geometries remain unchanged and Anatomy restores their exact coordinates. Hip ligaments use the same pelvis/femur proximity follower.
- Explicit ON stays opaque; only Fade applies 0.3 opacity. Left lists stay Japanese, two columns; hover retains JP/EN. Hip basic controls fit at 1280×800 without vertical scrolling.

## Scope and limits

Muscle skinning and light/dark cues are educational approximations, not measured muscle strain, activation, force, tendon wrapping or calibrated attachment footprints. Shared two-joint meshes follow the two bone transforms; a two-joint muscle force/length simulation remains deferred. Hip coefficients are inherited from the existing reference, including its whole-muscle approximations. Knee shading indicates relative shortening/lengthening for flexion/extension and rotation, without assigning contraction to varus/valgus. Accepted knee bone motion, menisci, patellar trajectory, axis guides and source-fitted cruciate surfaces are retained.

## Verification

- Syntax checks pass.
- 27/27 logic tests pass, including actual GLB catalog names, legacy Hip directions/actions, distinct tibial versus patellar insertion translations, source preservation and exact rest restoration.
- Shared Hip/Knee UI test passes: three Hip motion ranges, movement, Auto, Reset pose, Mode continuity, mesh registry continuity, missing-node restoration, Japanese two-column controls and 1280×800 layout.
- Screenshots: `screenshots/shared-muscles/hip.png`, `screenshots/shared-muscles/knee.png`.
- Complete UI regression result recorded below after the run completes.

The `kharuyama-lab/hip-kinesiology` repository and public site were not modified. `legacy/hip/index.html` was read only.

Final regression: full browser run executed 21 cases (20 passed; one failed solely on 27px Knee panel overflow). After extending the compact two-column density to Knee, the affected motion/layout case plus Atlas continuity and shared-muscle/Hip cases were rerun. Their final results are recorded with the release. No bone/meniscus/cruciate solver changes were made to address the layout issue.

Final rerun: 3/3 PASS (`atlas`, `motion`, `shared-muscles`); the shared test also verifies the identical Rectus femoris mesh UUID across Hip/Knee and restoration of Hip content from the previous ligament-review URL. Logic: 27/27 PASS. Both Hip and Knee compact panels have no overflow at 1280×800. All 21 browser scenarios now have passing coverage across the full run and affected-case rerun.
