import {Vector3,Quaternion} from 'three';
import {geometryInFrame,radialSurface} from './surface-geometry.js';
import {PATELLA as settings} from '../config/patella.js';
export class PatellaTracker{
 constructor(){this.path=[];this.current=null;}
 prepare({getMeshes,knee,flexAxis}){
  knee.updateWorldMatrix(true,true);const inverse=knee.matrixWorld.clone().invert(),femur=geometryInFrame(getMeshes('Femur.r'),inverse),patella=geometryInFrame(getMeshes('Patella.r'),inverse);
  const axis=new Vector3(...flexAxis).normalize(),anterior=new Vector3(0,0,1).projectOnPlane(axis).normalize(),up=new Vector3().crossVectors(anterior,axis),points=patella.vertices;
  const min=new Vector3(...[0,1,2].map(i=>Math.min(...points.map(p=>p.getComponent(i))))),max=new Vector3(...[0,1,2].map(i=>Math.max(...points.map(p=>p.getComponent(i))))),center=min.clone().add(max).multiplyScalar(.5),local=points.map(p=>p.clone().sub(center));
  const width=max.x-min.x,spread=width*.40;
  // Include peripheral posterior vertices as well: fitting only the central
  // articular patch can leave the patellar edge penetrating a condylar ridge.
  const samples=local.filter(p=>p.dot(anterior)<0);
  const start=Math.atan2(-center.dot(up),center.dot(anterior)),end=settings.endPolarDeg*Math.PI/180;
  this.path=[];let extensionOffset;
  for(let angle=0;angle<=settings.limitDeg;angle+=settings.pathStepDeg){
   const t=Math.min(1,angle/settings.engagementDeg),engagement=t*t*(3-2*t);
   const polar=start+(end-start)*angle/settings.limitDeg,n=anterior.clone().applyAxisAngle(axis,polar),q=new Quaternion().setFromAxisAngle(axis,angle*settings.flexionFraction*Math.PI/180),origin=axis.clone().multiplyScalar(center.dot(axis)*(1-engagement));
   const hits=[-spread,spread].map(s=>radialSurface(femur.triangles,origin.clone().addScaledVector(axis,s),n));
   if(hits.some(p=>!p))throw Error('Trochlear surface unavailable at '+angle+'°');
   const groove=hits[0].clone().add(hits[1]).multiplyScalar(.5);let depth=-Infinity;const constraints=[];
   for(const sample of samples){const offset=sample.clone().applyQuaternion(q),hit=radialSurface(femur.triangles,groove.clone().add(offset),n);if(hit){const required=hit.clone().sub(groove).sub(offset).dot(n);depth=Math.max(depth,required);constraints.push({offset,hit});}}
   if(constraints.length<3)throw Error('Insufficient patellar articular support at '+angle+'°');
   const target=groove.clone().addScaledVector(n,depth+settings.clearance);
   if(angle===0)extensionOffset=center.clone().sub(target);
   target.addScaledVector(extensionOffset,1-engagement);
   const translation=target.clone().sub(center.clone().applyQuaternion(q));
   this.path.push({angle,rotation:q,translation,center:target,groove,minimumRayGap:Math.min(...constraints.map(c=>target.clone().add(c.offset).sub(c.hit).dot(n))),supportSamples:constraints.length});
  }
 }
 pose(flexion){
  const f=Math.max(0,Math.min(settings.limitDeg,flexion)),i=Math.min(this.path.length-2,Math.floor(f/settings.pathStepDeg)),t=(f-this.path[i].angle)/settings.pathStepDeg,a=this.path[i],b=this.path[i+1];
  const pose={rotation:a.rotation.clone().slerp(b.rotation,t),translation:a.translation.clone().lerp(b.translation,t),center:a.center.clone().lerp(b.center,t),groove:a.groove.clone().lerp(b.groove,t),minimumRayGap:a.minimumRayGap+(b.minimumRayGap-a.minimumRayGap)*t,supportSamples:Math.min(a.supportSamples,b.supportSamples)};
  this.current=pose;return pose;
 }
 snapshot(){const p=this.current;return p?{status:'SURFACE TRACK REVIEW — NOT FIXED',center:p.center.toArray(),groove:p.groove.toArray(),minimumRayGap:p.minimumRayGap,supportSamples:p.supportSamples}:null;}
}
