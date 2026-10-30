import {Vector3,Matrix4} from 'three';
import {MENISCI} from '../config/menisci.js';
const names=['Medial meniscus.r','Lateral meniscus.r'];
export function meniscalExcursion(flexion,kind){
 const t=Math.min(1,Math.max(0,flexion/MENISCI.excursionThroughDeg)),progress=t*t*(3-2*t);
 // Posterior is -Z in the moving tibial frame, not in the fixed scene.
 return new Vector3(0,0,-MENISCI[kind].posteriorExcursion*progress);
}
export function rootWeight(point,roots){
 const distance=Math.min(...roots.map(p=>point.distanceTo(p))),t=Math.min(1,distance/MENISCI.rootRadius);
 return t*t*(3-2*t);
}
export class MeniscusFollower{
 constructor(){this.entries=[];}
 clear(){for(const e of this.entries){e.mesh.geometry=e.originalGeometry;e.geometry.dispose();}this.entries=[];}
 prepare({getMeshes,knee}){
  this.clear();knee.updateWorldMatrix(true,true);
  const inverse=knee.matrixWorld.clone().invert(),items=[];
  for(const [i,name] of names.entries())for(const mesh of getMeshes(name)){
   mesh.updateWorldMatrix(true,false);const matrix=new Matrix4().multiplyMatrices(inverse,mesh.matrixWorld),back=matrix.clone().invert();
   const originalGeometry=mesh.geometry,geometry=originalGeometry.clone(),a=geometry.attributes.position;
   const points=Array.from({length:a.count},(_,j)=>new Vector3().fromBufferAttribute(a,j).applyMatrix4(matrix));
   const center=points.reduce((sum,p)=>sum.add(p),new Vector3()).divideScalar(points.length);
   items.push({name,kind:i?'lateral':'medial',mesh,geometry,originalGeometry,back,points,center});mesh.geometry=geometry;
  }
  if(items.length<2)return;
  const midX=(items.find(e=>e.kind==='medial').center.x+items.find(e=>e.kind==='lateral').center.x)/2;
  for(const e of items){
   const zMin=Math.min(...e.points.map(p=>p.z)),zMax=Math.max(...e.points.map(p=>p.z)),span=zMax-zMin;
   // Estimated horn tips at intercondylar ends. These are mesh-based review
   // anchors and must be annotated before claiming anatomical root attachment.
   const tip=front=>e.points.filter(p=>front?p.z>zMax-span*.3:p.z<zMin+span*.3).reduce((best,p)=>Math.abs(p.x-midX)<Math.abs(best.x-midX)?p:best);
   const roots=[tip(true).clone(),tip(false).clone()];
   this.entries.push({...e,roots,weights:e.points.map(p=>rootWeight(p,roots)),displacement:new Vector3()});
  }
 }
 update(flexion){
  for(const e of this.entries){
   const delta=meniscalExcursion(flexion,e.kind);e.displacement.copy(delta);
   const a=e.geometry.attributes.position;
   for(let i=0;i<a.count;i++){const p=e.points[i].clone().addScaledVector(delta,e.weights[i]).applyMatrix4(e.back);a.setXYZ(i,p.x,p.y,p.z);}
   a.needsUpdate=true;e.geometry.computeVertexNormals();e.geometry.computeBoundingSphere();
  }
 }
 snapshot(){return this.entries.map(e=>({name:e.name,status:MENISCI.status,displacement:e.displacement.toArray(),centroidDisplacement:e.displacement.clone().multiplyScalar(e.weights.reduce((s,w)=>s+w,0)/e.weights.length).toArray(),roots:e.roots.map(p=>p.toArray()),maxWeight:Math.max(...e.weights)}));}
}
