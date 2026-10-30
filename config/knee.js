/** Knee v0.1 PRE-VALIDATION parameters. Do not use for quantitative clinical/biomechanical inference. */
export const KNEE = Object.freeze({
  status:'PRE-VALIDATION',
  // Shape-derived estimates only. Replace after joint center/axis validation.
  centerEstimate:{distalFemurFraction:.11,proximalTibiaFraction:.11,tibiaBlend:.45},
  hipEstimateFractions:[.564,.949,.690],
  startingHipFlexionDeg:90,
  startingKneeFlexionDeg:90,
  flexionRange:[0,120], // Contact review limited to fitted articular profile; deep flexion pending.
  axialRotationRange:[-15,30], // IR -15°, ER +30° at 90° flexion
  stressRange:[-3,3], // illustrative angular deviation, not a clinical gapping measurement
  stressFlexionDeg:30,
  screwHomeMaxExternalRotationDeg:9, // provisional illustrative value
  screwHomeWindowDeg:20,
  anatomicalNames:{
    femur:'Femur.r',tibia:'Tibia.r',fibula:'Fibula.r',patella:'Patella.r',
    medialMeniscus:'Medial meniscus.r',lateralMeniscus:'Lateral meniscus.r',
    acl:'Anterior cruciate ligament.r',pcl:'Posterior cruciate ligament.r',
    mcl:'Superficial part of tibial collateral ligament.r',
    mclDeep:'Deep part of tibial collateral ligament.r',
    lcl:'Fibular collateral ligament.r'
  }
});
export const PRESETS=Object.freeze({
  flex:{hip:90,knee:90,rot:0,stress:0},
  rot:{hip:90,knee:90,rot:0,stress:0},
  stress:{hip:90,knee:30,rot:0,stress:0}
});
// Comparison experiments only. These are not instructor-fixed calibration values.
export const KNEE_REVIEW=Object.freeze({
 status:'EXPERIMENTAL — NOT FIXED',
 distalFraction:.10,posteriorFraction:.4,notchExclusionFraction:.12,
 patellaArcFraction:.7,patellaArcStatus:'REJECTED — persistent separation'
});
