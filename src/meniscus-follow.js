import {Vector3,Quaternion,Matrix4} from 'three';
import {MENISCI} from '../config/menisci.js';
const names=['Medial meniscus.r','Lateral meniscus.r'];
// A smooth support proxy, NOT a tibiofemoral contact solver. Components are
// selected on the rest femur, then transformed into the actual tibial frame.
export function surfaceSupport(points,rotation,translation){
 const inverse=rotation.clone().invert();
 const moved=points.map(p=>p.clone().sub(translation).applyQuaternion(inverse));
 if(!moved.length)throw Error('Empty femoral compartment');
 const low=Math.min(...moved.map(p=>p.y));let weight=0;const result=new Vector3();
 for(const p of moved){const w=Math.exp(-(p.y-low)/MENISCI.supportSoftness);result.addScaledVector(p,w);weight+=w;}
 return result.divideScalar(weight);
}
export function meniscalDisplacement(current,rest,kind){
 const cfg=MENISCI[kind],delta=current.clone().sub(rest);
 // Remain on the tibial support plane: preserve rest thickness/height. Neither
 // vertical compression nor a contact force is invented by this visual follower.
 return new Vector3(cfg.maxML*Math.tanh(delta.x*cfg.mobility/cfg.maxML),0,cfg.maxAP*Math.tanh(delta.z*cfg.mobility/cfg.maxAP));
}
export function rootWeight(point,roots){
 const distance=Math.min(...roots.map(p=>point.distanceTo(p))),t=Math.min(1,distance/MENISCI.rootRadius);
 return t*t*(3-2*t);
}
export class MeniscusFollower{
 constructor(){this.entries=[];}
 clear(){for(const e of this.entries){e.mesh.geometry=e.originalGeometry;e.geometry.dispose();}this.entries=[];}
 prepare({getMeshes,femurPoints,knee,kneeCenter}){
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
  const femur=femurPoints.map(p=>new Vector3(...p).sub(kneeCenter)),low=Math.min(...femur.map(p=>p.y));
  for(const e of items){
   const side=Math.sign(e.center.x-midX),surface=femur.filter(p=>p.y<low+MENISCI.distalFemurDepth&&(p.x-midX)*side>0);
   if(!surface.length)throw Error('Missing femoral surface for '+e.name);
   const zMin=Math.min(...e.points.map(p=>p.z)),zMax=Math.max(...e.points.map(p=>p.z)),span=zMax-zMin;
   // Estimated horn tips at intercondylar ends. These are mesh-based review
   // anchors and must be annotated before claiming anatomical root attachment.
   const tip=front=>e.points.filter(p=>front?p.z>zMax-span*.3:p.z<zMin+span*.3).reduce((best,p)=>Math.abs(p.x-midX)<Math.abs(best.x-midX)?p:best);
   const roots=[tip(true).clone(),tip(false).clone()];
   this.entries.push({...e,surface,roots,weights:e.points.map(p=>rootWeight(p,roots)),restSupport:surfaceSupport(surface,new Quaternion(),new Vector3()),displacement:new Vector3()});
  }
 }
 update(rotation,translation){
  for(const e of this.entries){
   const delta=MENISCI.relativeExcursionEnabled?meniscalDisplacement(surfaceSupport(e.surface,rotation,translation),e.restSupport,e.kind):new Vector3();e.displacement.copy(delta);
   const a=e.geometry.attributes.position;
   for(let i=0;i<a.count;i++){const p=e.points[i].clone().addScaledVector(delta,e.weights[i]).applyMatrix4(e.back);a.setXYZ(i,p.x,p.y,p.z);}
   a.needsUpdate=true;e.geometry.computeVertexNormals();e.geometry.computeBoundingSphere();
  }
 }
 snapshot(){return this.entries.map(e=>({name:e.name,status:MENISCI.status,displacement:e.displacement.toArray(),roots:e.roots.map(p=>p.toArray()),maxWeight:Math.max(...e.weights)}));}
}
