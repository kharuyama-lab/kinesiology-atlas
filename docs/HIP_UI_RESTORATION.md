# Hip display controls and Mode placement

The Atlas port had limited category masters to Whole Body and omitted the completed Hip controls. Mode selection was also incorrectly placed in the top bar.

- Mode selection is in the left sidebar immediately before Focus.
- Hip bones, muscles and ligaments have explicit ON / Fade / OFF presets. Individual controls remain synchronized; mixed states show no selected preset.
- Muscle and connective presets affect only the current joint. Bone presets include the patella. Knee retains its separate bone/patella/axes row.
- Muscle action selection and floating selection stay synchronized. Switching modes preserves focus, camera and display states.
- Compact two-column tissue lists are retained.

Validation: syntax checks and 41 unit tests passed. Targeted browser tests cover bulk scoping, visibility/opacity, mode order, individual synchronization, state continuity, Auto and the 1280×800 layout. See screenshots/hip-bulk/hip-800.png.

Only Atlas was edited; legacy/hip/index.html was read as reference. No anatomy or muscle deformation changes are included in this UI correction. Existing anatomical validation limitations remain in force.
