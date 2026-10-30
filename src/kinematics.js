/** Pure movement mapping. Angles positive: flexion, external tibial rotation, valgus stress. */
export function clamp(x,lo,hi){return Math.min(hi,Math.max(lo,x));}
export function smootherStep(a,b,x){const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
export function screwHomeExternalRotationDeg(kneeFlexion,max=9,window=20){
  return max*(1-smootherStep(0,window,Math.max(0,kneeFlexion)));
}
export function activeKneeAngles(kind,slider){
  if(kind==='flex')return {flex:slider,rot:0,valgus:0};
  if(kind==='rot')return {flex:90,rot:slider,valgus:0};
  return {flex:30,rot:0,valgus:slider};
}
export function teachingLigamentTendency(kind,value){
  // Reference of categorical direction only; not numerical strain or load.
  if(kind==='stress')return value>0.25?{mcl:'強調',lcl:'通常',acl:'通常',pcl:'通常'}:
    value<-.25?{mcl:'通常',lcl:'強調',acl:'通常',pcl:'通常'}:{};
  if(kind==='rot')return value>0.5?{mcl:'強調',lcl:'強調',acl:'通常',pcl:'通常'}:
    value<-.5?{mcl:'通常',lcl:'通常',acl:'強調',pcl:'強調'}:{};
  return value<12?{mcl:'強調',lcl:'強調',acl:'角度依存',pcl:'角度依存'}:
    {mcl:'弛緩傾向',lcl:'弛緩傾向',acl:'角度依存',pcl:'角度依存'};
}
