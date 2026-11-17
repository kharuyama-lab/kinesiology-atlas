import {Vector3,Matrix4} from 'three';
import {ankleMuscles,ankleCalf,ankleStaticMuscles} from '../config/ankle-muscles.js';
import {BoneSurface} from './bone-surface.js';
import {AchillesRoute} from './ankle-achilles.js';
import {resolveMuscleContact} from './ankle-muscle-contact.js';
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
// A source-preserving teaching deformation. Bone-local terminal collars retain
// their original offsets. They are not newly measured anatomical footprints.
export function ankleMuscleWeight(name,p){
 if(ankleCalf(name))return 0; // Actual calf deformation belongs to AchillesRoute.
 // Keep the malleolar passage with the shank, then carry the distal tendon
 // with the foot. The source's medial/lateral course is retained at rest.
 const posterior=/Fibularis (longus|brevis)|Tibialis posterior|Flexor (hallucis|digitorum) longus/.test(name);
 const upper=posterior?smooth((.055-p.y)/.010):smooth((.105-p.y)/.065);
 return Math.max(upper,smooth((p.z+.040)/.020)*smooth((.100-p.y)/.025));
}
export class AnkleMuscleFollower{
 constructor(){this.entries=[];this.frames=new Map();this.active=false;}
 clear(){for(const e of [...this.entries,...this.staticEntries||[]])e.mesh.geometry.dispose();this.entries=[];this.staticEntries=[];this.achilles=null;this.frames.clear();this.active=false;this.last=null;}
 prepare({registered,getMeshes}){
  this.entries=[];this.frames.clear();this.last=null;
  const bones=[...registered.keys()].filter(n=>/^(Femur|Tibia|Fibula|Talus|Calcaneus|Navicular bone|Cuboid bone|.*cuneiform bone|.*metatarsal bone|.*phalanx.*foot|Sesamoid bones of foot)\.r$/.test(n));
  for(const name of bones){const bone=registered.get(name);bone.updateWorldMatrix(true,false);const surface=new BoneSurface(bone,getMeshes(name));this.frames.set(name,{bone,surface,rest:bone.matrixWorld.clone(),inverse:bone.matrixWorld.clone().invert(),delta:new Matrix4()});}
  const achilles=[];for(const mesh of getMeshes('Calcaneal tendon.r')){mesh.updateWorldMatrix(true,false);const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++)achilles.push(new Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld));}
  const bottom=Math.min(...achilles.map(p=>p.y)),calcSurface=this.frames.get('Calcaneus.r').surface;
  // The source has a broad posterior calcaneal attachment, not just its lowest
  // horizontal row. Carry that complete source region with the calcaneus.
  const contact=achilles.filter(p=>p.y<.08&&calcSurface.nearest(p).distance<.004);
  const collar=contact.length?contact:achilles.filter(p=>p.y<=bottom+.005);
  const endY=Math.max(bottom+.005,...collar.map(p=>p.y))+.002;
  this.calfInsertion=collar.reduce((sum,p)=>sum.add(p),new Vector3()).multiplyScalar(1/collar.length);this.calfParameters={endY,topY:.36,collar:.035};
  this.achilles=new AchillesRoute(achilles,endY);
  for(const [name,,distal] of ankleMuscles){
   const meshes=getMeshes(name);if(!meshes.length)throw Error('Missing ankle muscle: '+name);
   const source=meshes.flatMap(mesh=>{mesh.updateWorldMatrix(true,false);return Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>new Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld));});
   const hi=Math.max(...source.map(p=>p.y)),lo=Math.min(...source.map(p=>p.y));
   for(const mesh of meshes){mesh.geometry=mesh.geometry.clone();mesh.updateWorldMatrix(true,false);const attribute=mesh.geometry.attributes.position,rest=Array.from({length:attribute.count},(_,i)=>new Vector3().fromBufferAttribute(attribute,i).applyMatrix4(mesh.matrixWorld));
    const owners=rest.map(p=>{
     // Proximal collars are anatomical origins; gastrocnemius/plantaris are
     // femoral, the other lower-leg origins are carried by the shank.
     if(p.y>=hi-(hi-lo)*.025&&name!=='Calcaneal tendon.r'&&name!=='Tendon of extensor digitorum longus.r'){
      const candidates=/gastrocnemius|Plantaris/.test(name)?['Femur.r']:['Tibia.r','Fibula.r'];
      const proximal=candidates.sort((a,b)=>this.frames.get(a).surface.nearest(p).distance-this.frames.get(b).surface.nearest(p).distance)[0];
      return {name:proximal,weight:0,pin:true,carrier:proximal};
     }
     const weight=ankleMuscleWeight(name,p),pin=ankleCalf(name)?p.y<=this.calfParameters.endY:weight===1&&p.z>=.020;
     const carrier=ankleCalf(name)?pin?'Calcaneus.r':p.y>=.36?'Tibia.r':null:weight===0?'Tibia.r':weight===1?distal:null;
     return {name:distal,weight,pin,carrier};
    });
    this.entries.push({name,mesh,rest,source:new Float32Array(attribute.array),owners,distal,hi,lo,maxDisplacement:0,corrections:0});
   }
  }
  this.staticEntries=[];for(const [name] of ankleStaticMuscles)for(const mesh of getMeshes(name).filter(Boolean)){
   mesh.geometry=mesh.geometry.clone();mesh.updateWorldMatrix(true,false);const attribute=mesh.geometry.attributes.position,rest=Array.from({length:attribute.count},(_,i)=>new Vector3().fromBufferAttribute(attribute,i).applyMatrix4(mesh.matrixWorld));
   const heelOrigin=/Abductor (hallucis|digiti minimi)|Extensor (digitorum|hallucis) brevis|Flexor digitorum brevis|Quadratus plantae/.test(name);
   const owners=rest.map(p=>{const weight=heelOrigin?smooth((-.005-p.z)/.040):0;return {weight,pin:p.z<=-.045||p.z>=.020,carrier:weight===0?'First metatarsal bone.r':weight===1?'Calcaneus.r':null};});
   this.staticEntries.push({name,mesh,rest,owners,source:new Float32Array(attribute.array)});
  }
 }
 update(active){
  if(!active){if(this.active)for(const e of [...this.entries,...this.staticEntries]){e.mesh.geometry.attributes.position.array.set(e.source);e.mesh.geometry.attributes.position.needsUpdate=true;e.mesh.geometry.computeVertexNormals();e.mesh.geometry.computeBoundingSphere();}this.active=false;this.last=null;return;}
  this.active=true;
  for(const f of this.frames.values()){f.bone.updateWorldMatrix(true,false);f.delta.multiplyMatrices(f.bone.matrixWorld,f.inverse);f.surface.refresh();f.box=f.surface.tree.box.clone().applyMatrix4(f.surface.world);}
  const state=[...[...this.frames.values()].flatMap(f=>f.bone.matrixWorld.elements),...[...this.entries,...this.staticEntries].map(e=>e.mesh.visible?1:0)];
  if(this.last&&state.every((n,i)=>Math.abs(n-this.last[i])<1e-10))return;
  const started=performance.now();
  this.last=state;const shank=this.frames.get('Tibia.r'),v=new Vector3(),a=new Vector3();
  this.achilles.update(shank.delta,this.frames.get('Calcaneus.r').delta);
  for(const e of this.entries){if(!e.mesh.visible)continue;const inverse=e.mesh.matrixWorld.clone().invert(),attribute=e.mesh.geometry.attributes.position,points=[];e.maxDisplacement=0;e.corrections=0;
   for(let i=0;i<e.rest.length;i++){
    const p=e.rest[i],owner=e.owners[i],frame=this.frames.get(owner.name);
    if(owner.pin)v.copy(p).applyMatrix4(frame.delta);
    else if(e.name==='Calcaneal tendon.r')this.achilles.tendon(p,v);
    else if(ankleCalf(e.name))this.achilles.muscle(p,v);
    else{v.copy(p).applyMatrix4(shank.delta);a.copy(p).applyMatrix4(frame.delta);v.lerp(a,owner.weight);}
    points.push(v.clone());
   }
   const moving=this.frames.get(e.distal).delta.elements.some((n,j)=>Math.abs(n-shank.delta.elements[j])>1e-8);
   const contactStarted=performance.now();if(moving&&e.name!=='Calcaneal tendon.r')e.corrections=resolveMuscleContact(e,points,this.frames);e.contactMs=performance.now()-contactStarted;
   for(let i=0;i<points.length;i++){e.maxDisplacement=Math.max(e.maxDisplacement,e.rest[i].distanceTo(points[i]));v.copy(points[i]).applyMatrix4(inverse);attribute.setXYZ(i,v.x,v.y,v.z);}
   attribute.needsUpdate=true;e.mesh.geometry.computeVertexNormals();e.mesh.geometry.computeBoundingSphere();
  }
  // Intrinsics have no active contraction or toe motion. Where a source muscle
  // bridges hindfoot and midfoot, passively follow both instead of burying its
  // heel origin when those two bones move relative to each other.
  const calc=this.frames.get('Calcaneus.r'),forefoot=this.frames.get('First metatarsal bone.r');
  for(const e of this.staticEntries){
   if(!e.mesh.visible)continue;
   const points=e.rest.map((p,i)=>p.clone().applyMatrix4(forefoot.delta).lerp(p.clone().applyMatrix4(calc.delta),e.owners[i].weight));
   if(calc.delta.elements.some((n,i)=>Math.abs(n-forefoot.delta.elements[i])>1e-8))resolveMuscleContact(e,points,this.frames);
   const inverse=e.mesh.matrixWorld.clone().invert(),attribute=e.mesh.geometry.attributes.position;
   for(let i=0;i<points.length;i++){v.copy(points[i]).applyMatrix4(inverse);attribute.setXYZ(i,v.x,v.y,v.z);}attribute.needsUpdate=true;e.mesh.geometry.computeVertexNormals();e.mesh.geometry.computeBoundingSphere();
  }
  this.updateMs=performance.now()-started;
 }
 snapshot(){return this.entries.map(e=>({name:e.name,vertices:e.rest.length,distal:e.distal,maxDisplacement:e.maxDisplacement,visible:e.mesh.visible,corrections:e.corrections,contactMs:e.contactMs,terminalPins:e.owners.filter(o=>o.pin).length}));}
 geometry(name){return this.entries.filter(e=>e.name===name).map(e=>({rest:e.rest.map(p=>p.toArray()),positions:e.rest.map((_,i)=>new Vector3().fromBufferAttribute(e.mesh.geometry.attributes.position,i).applyMatrix4(e.mesh.matrixWorld).toArray()),indices:e.mesh.geometry.index?Array.from(e.mesh.geometry.index.array):null}));}
 contactAudit(names=null){
  const report=[];
  for(const e of [...this.entries,...this.staticEntries||[]]){if(!e.mesh.visible||names&&!names.includes(e.name))continue;let maxAddedDepth=0,worst=null,samples=0;const position=e.rest.map((_,i)=>new Vector3().fromBufferAttribute(e.mesh.geometry.attributes.position,i).applyMatrix4(e.mesh.matrixWorld));
   const probe=(rest,posed)=>{samples++;
    for(const [name,f] of this.frames){if(!f.box.containsPoint(posed))continue;const local=posed.clone().applyMatrix4(f.surface.inverse);if(!f.surface.insideLocal(local))continue;
     const source=rest.clone().applyMatrix4(f.inverse),baseline=f.surface.insideLocal(source)?f.surface.nearestLocal(source).distance:0,added=f.surface.nearestLocal(local).distance-baseline;
     if(added>maxAddedDepth){maxAddedDepth=added;worst={bone:name,rest:rest.toArray(),position:posed.toArray(),baseline};}
    }
   };
   for(let i=0;i<e.rest.length;i++)probe(e.rest[i],position[i]);const index=e.mesh.geometry.index;
   if(index)for(let i=0;i<index.count;i+=3){const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];probe(ids.reduce((p,j)=>p.add(e.rest[j]),new Vector3()).multiplyScalar(1/3),ids.reduce((p,j)=>p.add(position[j]),new Vector3()).multiplyScalar(1/3));}
   report.push({name:e.name,static:!!this.staticEntries?.includes(e),samples,maxAddedDepth,worst});
  }return report;
 }
 calfContactAudit(){
  const report=[];
  for(const e of this.entries.filter(e=>ankleCalf(e.name))){let maxAddedDepth=0,worst=null,samples=0;const position=e.rest.map((_,i)=>new Vector3().fromBufferAttribute(e.mesh.geometry.attributes.position,i).applyMatrix4(e.mesh.matrixWorld));
   const probe=(rest,posed)=>{if(rest.y<=this.calfParameters.endY+.0001||rest.y>.14)return;samples++;
    for(const [name,f] of this.frames){if(name==='Femur.r'||!f.box.containsPoint(posed))continue;const local=posed.clone().applyMatrix4(f.surface.inverse);if(!f.surface.insideLocal(local))continue;
     const source=rest.clone().applyMatrix4(f.inverse),baseline=f.surface.insideLocal(source)?f.surface.nearestLocal(source).distance:0,added=f.surface.nearestLocal(local).distance-baseline;
     if(added>maxAddedDepth){maxAddedDepth=added;worst={bone:name,rest:rest.toArray(),position:posed.toArray()};}
    }
   };
   for(let i=0;i<e.rest.length;i++)probe(e.rest[i],position[i]);const index=e.mesh.geometry.index;
   if(index)for(let i=0;i<index.count;i+=3){const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];probe(ids.reduce((p,j)=>p.add(e.rest[j]),new Vector3()).multiplyScalar(1/3),ids.reduce((p,j)=>p.add(position[j]),new Vector3()).multiplyScalar(1/3));}
   report.push({name:e.name,samples,maxAddedDepth,worst});
  }return report;
 }
 audit(){let terminalError=0,restError=0,finite=true;const v=new Vector3();for(const e of this.entries){if(!e.mesh.visible)continue;e.mesh.updateWorldMatrix(true,false);const attr=e.mesh.geometry.attributes.position;for(let i=0;i<e.rest.length;i++){v.fromBufferAttribute(attr,i).applyMatrix4(e.mesh.matrixWorld);finite&&=Number.isFinite(v.lengthSq());if(e.owners[i].pin){const f=this.frames.get(e.owners[i].name),expected=e.rest[i].clone().applyMatrix4(f.delta);terminalError=Math.max(terminalError,v.distanceTo(expected));}restError=Math.max(restError,v.distanceTo(e.rest[i]));}}return {finite,terminalError,restError,updateMs:this.updateMs,entries:this.snapshot(),status:'source-preserving teaching deformation; not measured muscle force or validated footprints'};}
}
