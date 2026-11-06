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

## Coupled motion extension

The user-provided Michaud teaching table is a reference, not a force dataset.
The three oblique-axis controls now share cues evaluated from the same physical
coronal component: invert/compound value, or adduct value * ST.z / ST.y. Equal
bone poses consequently have equal engagement despite different slider labels.
The 10/20 degree display envelopes are illustrative, not experimental thresholds.

- TCL: emphasize eversion/pronation-side elongation. Merian et al. 2011 measured
  greater TCL length in eversion than inversion in eight loaded cadaver limbs:
  https://doi.org/10.3113/FAI.2011.0457 . This supports a directional teaching cue;
  it does not reproduce the experiment's loading, force or percentage strain.
  No extra DF is assumed, no posterior-band/TNL rule is extrapolated, and no
  reverse-direction slack is inferred for this coupled rule.
- ITCL: show **restraint contribution**, explicitly identified on hover, rather
  than calling sectioning evidence a tension measurement. Supination-side support:
  Knudson et al. 1997, six specimens, sectioning increased supination displacement:
  https://pubmed.ncbi.nlm.nih.gov/9385243/ . Both inversion/eversion restraint:
  Iglesias-Duran et al. 2023, fifteen legs, sequential sectioning and reconstruction:
  https://doi.org/10.1007/s00167-023-07622-6 . Studies differ: Pellegrini et al. 2016
  found significant increases only after CFL sectioning in their test protocol:
  https://pubmed.ncbi.nlm.nih.gov/27194494/ . Merian did not find significant ITCL
  elongation. The cue therefore indicates reported participation, not primary
  restraint, consensus ranking, proof of tension, or strain magnitude. No ITCL
  sag/laxity rule is assigned. Pulse strength is not comparable across ligaments.

Unmapped structures remain unassessed. ATFL/CFL/PTFL are absent from the pinned
GLBs; anterior talocalcaneal is not relabeled cervical. Subtype-ambiguous bands
(posterolateral/posteromedial talocalcaneal and bifurcate) are not guessed from
similar generic mesh names. No bone axes, muscles, shared GLB assets, Hip/Knee
behavior, or public deployment are changed.
