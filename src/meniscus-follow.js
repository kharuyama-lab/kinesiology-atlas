import {Vector3,Matrix4} from 'three';
import {MENISCI} from '../config/menisci.js';
import {geometryInFrame,upperSurface,surfaceHeight} from './surface-geometry.js';
const names=['Medial meniscus.r','Lateral meniscus.r'];
export function contactInTibia(pose,kind){const contact=pose?.contacts?.find(c=>c.kind===kind);return contact?new Vector3(...contact.femoral).sub(pose.translation).applyQuaternion(pose.knee.clone().invert()):null;}
export function centreTranslation(anchor,target,influence){return target.clone().sub(anchor).setY(0).divideScalar(Math.max(influence,1e-6));}
export function compressionFromGap(currentGap,neutralGap,height){return Math.max(0,Math.min(MENISCI.maxCompression,(neutralGap-currentGap)/Math.max(height,.002)));}
export function rootWeight(point,roots){
 const distance=Math.min(...roots.map(p=>point.distanceTo(p))),t=Math.min(1,distance/MENISCI.rootRadius);
 return t*t*(3-2*t);
}
export class MeniscusFollower{
 constructor(){this.entries=[];}
 clear(){for(const e of this.entries){e.mesh.geometry=e.originalGeometry;e.geometry.dispose();}this.entries=[];}
 prepare({getMeshes,knee,referenceContacts}){
  this.clear();knee.updateWorldMatrix(true,true);
  const inverse=knee.matrixWorld.clone().invert(),items=[];
  this.surface=upperSurface(geometryInFrame(getMeshes('Tibia.r'),inverse).triangles);
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
   const weights=e.points.map(p=>rootWeight(p,roots)),offsets=[],baseDistances=[];
   for(let i=0;i<e.points.length;i++){
    const rest=e.points[i],base=surfaceHeight(this.surface,rest.x,rest.z);offsets.push(rest.y-base.height);baseDistances.push(base.distance);
   }
   const reference=new Vector3(...referenceContacts.find(c=>c.kind===e.kind).reference);
   let loadWeights=e.points.map((p,i)=>weights[i]>.7?Math.exp(-((p.x-reference.x)**2+(p.z-reference.z)**2)/(2*MENISCI.loadPatchRadius**2)):0),total=loadWeights.reduce((s,w)=>s+w,0);
   if(total<1e-9)throw Error('No meniscal support patch for '+e.name);loadWeights=loadWeights.map(w=>w/total);
   const anchor=e.points.reduce((s,p,i)=>s.addScaledVector(p,loadWeights[i]),new Vector3()),influence=weights.reduce((s,w,i)=>s+w*loadWeights[i],0),nominalHeight=Math.max(.002,Math.min(.008,Math.max(...offsets)));
   this.entries.push({...e,roots,weights,offsets,baseDistances,loadWeights,anchor,influence,nominalHeight,displacement:new Vector3(),centroidDisplacement:new Vector3(),supportCentre:anchor.clone(),contactTarget:reference.clone(),contactResidual:0,compression:0,gapChange:0,maxHeightChange:0});
  }
 }
 update(flexion,{pose,neutral,active=1}={}){
  for(const e of this.entries){
   const target=contactInTibia(pose,e.kind)||e.anchor,neutralTarget=contactInTibia(neutral,e.kind)||target;
   // Contact migrates across material points. Select a smooth load-bearing
   // patch around the current contact, rather than dragging one material patch
   // through the entire ring for every movement.
   const raw=e.points.map((p,i)=>e.weights[i]>.7?Math.exp(-((p.x-target.x)**2+(p.z-target.z)**2)/(2*MENISCI.loadPatchRadius**2)):0),sum=raw.reduce((s,w)=>s+w,0);e.loadWeights=raw.map(w=>w/sum);
   const anchor=e.points.reduce((s,p,i)=>s.addScaledVector(p,e.loadWeights[i]),new Vector3()),influence=e.weights.reduce((s,w,i)=>s+w*e.loadWeights[i],0),delta=centreTranslation(anchor,target,influence).multiplyScalar(active);
   if(delta.length()>MENISCI.maxCentreTravel)delta.setLength(MENISCI.maxCentreTravel);e.displacement.copy(delta);e.contactTarget.copy(target);
   const gap=target.y-surfaceHeight(this.surface,target.x,target.z).height,neutralGap=neutralTarget.y-surfaceHeight(this.surface,neutralTarget.x,neutralTarget.z).height;
   e.compression=compressionFromGap(gap,neutralGap,e.nominalHeight)*active;e.gapChange=gap-neutralGap;
   const a=e.geometry.attributes.position;
   e.centroidDisplacement.set(0,0,0);e.supportCentre.set(0,0,0);e.maxHeightChange=0;
   for(let i=0;i<a.count;i++){
    const rest=e.points[i],move=delta.clone().multiplyScalar(e.weights[i]),local=rest.clone().add(move);
    if(surfaceHeight(this.surface,local.x,local.z).distance>e.baseDistances[i]+.0005){let lo=0,hi=1;for(let j=0;j<10;j++){const t=(lo+hi)/2,p=rest.clone().addScaledVector(move,t);if(surfaceHeight(this.surface,p.x,p.z).distance<=e.baseDistances[i]+.0005)lo=t;else hi=t;}local.copy(rest).addScaledVector(move,lo);}
    local.y=surfaceHeight(this.surface,local.x,local.z).height+e.offsets[i]-Math.max(0,e.offsets[i])*e.compression*e.weights[i];
    const change=local.clone().sub(rest);e.centroidDisplacement.add(change);e.supportCentre.addScaledVector(local,e.loadWeights[i]);e.maxHeightChange=Math.max(e.maxHeightChange,Math.abs(change.y));const p=local.applyMatrix4(e.back);a.setXYZ(i,p.x,p.y,p.z);
   }e.centroidDisplacement.divideScalar(a.count);e.contactResidual=Math.hypot(e.supportCentre.x-target.x,e.supportCentre.z-target.z);
   a.needsUpdate=true;e.geometry.computeVertexNormals();e.geometry.computeBoundingSphere();
  }
 }
 snapshot(){return this.entries.map(e=>({name:e.name,status:MENISCI.status,displacement:e.displacement.toArray(),centroidDisplacement:e.centroidDisplacement.toArray(),supportCentre:e.supportCentre.toArray(),contactTarget:e.contactTarget.toArray(),contactResidual:e.contactResidual,compression:e.compression,gapChange:e.gapChange,maxHeightChange:e.maxHeightChange,roots:e.roots.map(p=>p.toArray()),maxWeight:Math.max(...e.weights)}));}
}
