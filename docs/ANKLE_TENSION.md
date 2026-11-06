# Ankle qualitative tension display

This is an educational visual effect, not a mechanical force, strain, injury-risk,
or slack-length simulation. Scores and display ranges are smooth visual envelopes,
not fitted measurements. A dark or unhighlighted band does not imply zero force.

In Ankle Kinesiology, isolated dorsiflexion emphasizes tibiocalcaneal and generic
posterior tibiotalar; plantarflexion emphasizes tibionavicular. The opposite
direction adds a small exterior bow (maximum 1.2 mm or 6% of span). This bow is
an illustration of relative relaxation, not proof of buckling at a measured angle.
Neutral retains the accepted original shape. All effects use rendered pose rather
than the target slider, and preserve On/Fade/Off and terminal bone footprints.
Every bow candidate is checked at body vertices and triangle centroids by the
existing bone exclusion method; it is reduced or omitted if unsafe. This discrete
check is not a continuous collision guarantee. The existing route smoothing is
retained. Identity hue is retained. Increased saturation and a darker base combine with a gentle
1.6-second same-color emission pulse; engagement increases its amplitude. No yellow
or white highlight is overlaid. The hover identifies unmapped motion/ligament pairs
as unassessed, rather than implying relaxation.

Evidence:
- Takao et al. 2020, six cadaver specimens, superficial deltoid band strain:
  https://pubmed.ncbi.nlm.nih.gov/32386522/ (doi:10.1186/s12891-020-03296-0).
  TNL plantarflexion, TCL dorsiflexion/pronation, superficial PTTL dorsiflexion.
- Gregersen et al. 2022, deltoid band anatomy/function:
  https://pmc.ncbi.nlm.nih.gov/articles/PMC9201323/ . Supports posterior-band
  dorsiflexion tendency. The GLB does not identify superficial versus deep PTTL;
  therefore no band-specific magnitude or external-rotation rule is assigned.

The user-provided Michaud teaching table is a reference, not a force dataset.
No independent eversion, adduction, or pronation rule is assigned: this model
drives subtalar/midfoot oblique axes with zero talocrural DF in those modes,
which does not reproduce the study's imposed DF-abduction loading condition.
ITCL findings vary and are not mapped. ATFL/CFL/PTFL are absent from the pinned
GLBs; the anterior talocalcaneal mesh is not relabeled as cervical ligament.
No effect is assigned to unsupported structures. No bone axes, muscles,
shared GLB assets, Hip/Knee behavior, or public deployment are changed.
