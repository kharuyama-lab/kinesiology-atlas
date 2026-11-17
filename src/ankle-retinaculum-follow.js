import {Vector3} from 'three';
import {ankleRetinacula} from '../config/ankle-retinacula.js';
import {TissueSheet} from './ankle-tissue-sheet.js';
import {resolveMuscleContact} from './ankle-muscle-contact.js';
const covered=name=>/fibular/i.test(name)?['Fibularis longus muscle.r','Fibularis brevis muscle.r']:/Flexor retinaculum/.test(name)?['Tibialis posterior muscle.r','Flexor digitorum longus.r','Flexor hallucis longus.r']:['Tibialis anterior muscle.r','Extensor digitorum longus.r','Tendon of extensor digitorum longus.r','Extensor hallucis longus.r','Fibularis tertius muscle.r'];
export class AnkleRetinaculumFollower{
 constructor(){this.entries=[];}
 clear(){for(const e of this.entries)e.mesh.geometry.dispose();this.entries=[];this.lastVersion=null;}
 prepare({getMeshes,muscleFollower}){
  this.muscleFollower=muscleFollower;this.getMeshes=getMeshes;this.muscleSheets=new Map();this.entries=[];
  for(const [name,,bones,direction] of ankleRetinacula)for(const mesh of getMeshes(name)){
   mesh.geometry=mesh.geometry.clone();mesh.updateWorldMatrix(true,false);const a=mesh.geometry.attributes.position,rest=Array.from({length:a.count},(_,i)=>new Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld));
   const bindings=rest.map(p=>{const candidates=bones.map(n=>{const frame=muscleFollower.frames.get(n);return {frame,hit:frame.surface.nearest(p)};}).sort((a,b)=>a.hit.distance-b.hit.distance),first=candidates[0],second=candidates[1],d=Math.max(.0002,first.hit.distance),other=second?Math.max(.0002,second.hit.distance):0,weight=second?other**2/(d*d+other*other):1;const normal=new Vector3(...direction);if(name.startsWith('Inferior extensor')){const t=Math.max(0,Math.min(1,(.095-p.y)/.05));normal.set(0,t,1-t).normalize();}return {first:first.frame,second:second?.frame,weight,pin:first.hit.distance<.0008,normal};});
   this.entries.push({name,mesh,rest,bindings,owners:bindings.map(b=>({pin:b.pin})),source:new Float32Array(a.array),covers:covered(name),coverError:0});
  }
 }
 requiredTendons(){return new Set(this.entries.filter(e=>e.mesh.visible).flatMap(e=>e.covers));}
 update(active){
  if(!active){if(this.active)for(const e of this.entries){e.mesh.geometry.attributes.position.array.set(e.source);e.mesh.geometry.attributes.position.needsUpdate=true;e.mesh.geometry.computeVertexNormals();e.mesh.geometry.computeBoundingSphere();}this.active=false;this.lastVersion=null;return;}
  this.active=true;const version=[this.muscleFollower.geometryVersion,...this.entries.map(e=>e.mesh.visible?1:0)].join(',');if(this.lastVersion===version)return;this.lastVersion=version;
  const needed=new Set(this.entries.filter(e=>e.mesh.visible).flatMap(e=>e.covers));
  for(const name of needed)for(const mesh of this.getMeshes(name)){if(!mesh.visible&&mesh.userData.atlasSourceMaterialName!=='Tendon')continue;let sheet=this.muscleSheets.get(mesh);if(!sheet){sheet=new TissueSheet(mesh);this.muscleSheets.set(mesh,sheet);}else sheet.update();}
  for(const e of this.entries){if(!e.mesh.visible)continue;const points=e.rest.map((p,i)=>{const b=e.bindings[i],v=p.clone().applyMatrix4(b.first.delta);return b.second&&!b.pin?v.multiplyScalar(b.weight).addScaledVector(p.clone().applyMatrix4(b.second.delta),1-b.weight):v;});
   e.coverError=0;
   const cover=(point,normal)=>{let outer=0;for(const name of e.covers)for(const mesh of this.getMeshes(name)){const sheet=this.muscleSheets.get(mesh),hit=sheet?.outerHit(point,normal);if(hit)outer=Math.max(outer,hit.sub(point).dot(normal)+.0005);}return outer>0&&outer<.012?normal.clone().multiplyScalar(outer):null;};
   const normals=e.bindings.map(b=>b.normal.clone().transformDirection(b.first.delta)),index=e.mesh.geometry.index;
   for(let pass=0;pass<4;pass++){
    for(let i=0;i<points.length;i++)if(!e.bindings[i].pin){const move=cover(points[i],normals[i]);if(move)points[i].add(move);}
    if(index)for(let k=0;k<index.count;k+=3){const ids=[index.getX(k),index.getX(k+1),index.getX(k+2)],free=ids.filter(i=>!e.bindings[i].pin);if(!free.length)continue;const center=ids.reduce((p,i)=>p.add(points[i]),new Vector3()).multiplyScalar(1/3),normal=ids.reduce((p,i)=>p.add(normals[i]),new Vector3()).normalize(),move=cover(center,normal);if(move)for(const i of free)points[i].addScaledVector(move,3/free.length);}
    resolveMuscleContact(e,points,this.muscleFollower.frames);
   }
   const inverse=e.mesh.matrixWorld.clone().invert(),a=e.mesh.geometry.attributes.position;
   for(let i=0;i<points.length;i++){const p=points[i].applyMatrix4(inverse);a.setXYZ(i,p.x,p.y,p.z);}a.needsUpdate=true;e.mesh.geometry.computeVertexNormals();e.mesh.geometry.computeBoundingSphere();
  }
 }
 snapshot(){return this.entries.map(e=>({name:e.name,vertices:e.rest.length,visible:e.mesh.visible,anchors:e.bindings.filter(b=>b.pin).length,covers:e.covers}));}
 audit(){return this.entries.filter(e=>e.mesh.visible).map(e=>{
  let maxAnchorError=0,maxCoverError=0;const points=e.rest.map((_,i)=>new Vector3().fromBufferAttribute(e.mesh.geometry.attributes.position,i).applyMatrix4(e.mesh.matrixWorld)),normals=e.bindings.map(b=>b.normal.clone().transformDirection(b.first.delta));
  const probe=(point,normal)=>{for(const name of e.covers)for(const mesh of this.getMeshes(name)){const sheet=this.muscleSheets.get(mesh),hit=sheet?.outerHit(point,normal);if(hit){const overlap=hit.sub(point).dot(normal);if(overlap<.012)maxCoverError=Math.max(maxCoverError,overlap);}}};
  for(let i=0;i<points.length;i++){const b=e.bindings[i];if(b.pin)maxAnchorError=Math.max(maxAnchorError,points[i].distanceTo(e.rest[i].clone().applyMatrix4(b.first.delta)));else probe(points[i],normals[i]);}
  const index=e.mesh.geometry.index;if(index)for(let k=0;k<index.count;k+=3){const ids=[index.getX(k),index.getX(k+1),index.getX(k+2)];if(ids.every(i=>e.bindings[i].pin))continue;probe(ids.reduce((p,i)=>p.add(points[i]),new Vector3()).multiplyScalar(1/3),ids.reduce((p,i)=>p.add(normals[i]),new Vector3()).normalize());}
  return {name:e.name,maxAnchorError,maxCoverError};
 });}
}
