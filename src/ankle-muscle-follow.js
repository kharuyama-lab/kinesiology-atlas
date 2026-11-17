import {Vector3,Matrix4} from 'three';
import {ankleMuscles,ankleCalf} from '../config/ankle-muscles.js';
import {BoneSurface} from './bone-surface.js';
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
// A source-preserving teaching deformation. Bone-local terminal collars retain
// their original offsets. They are not newly measured anatomical footprints.
export function ankleMuscleWeight(name,p){
 if(ankleCalf(name))return smooth((.42-p.y)/.39);
 // Keep the malleolar passage with the shank, then carry the distal tendon
 // with the foot. The source's medial/lateral course is retained at rest.
 return Math.max(smooth((.105-p.y)/.065),smooth((p.z-.005)/.018));
}
export class AnkleMuscleFollower{
 constructor(){this.entries=[];this.frames=new Map();this.active=false;}
 clear(){for(const e of this.entries)e.mesh.geometry.dispose();this.entries=[];this.frames.clear();this.active=false;this.last=null;}
 prepare({registered,getMeshes}){
  this.entries=[];this.frames.clear();this.last=null;
  const bones=[...registered.keys()].filter(n=>/^(Femur|Tibia|Fibula|Talus|Calcaneus|Navicular bone|Cuboid bone|.*cuneiform bone|.*metatarsal bone|.*phalanx.*foot|Sesamoid bones of foot)\.r$/.test(n));
  for(const name of bones){const bone=registered.get(name);bone.updateWorldMatrix(true,false);const surface=new BoneSurface(bone,getMeshes(name));this.frames.set(name,{bone,surface,rest:bone.matrixWorld.clone(),inverse:bone.matrixWorld.clone().invert(),delta:new Matrix4()});}
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
      return {name:proximal,weight:0,pin:true};
     }
     const weight=ankleMuscleWeight(name,p);return {name:distal,weight,pin:weight===1};
    });
    this.entries.push({name,mesh,rest,source:new Float32Array(attribute.array),owners,distal,hi,lo,maxDisplacement:0,corrections:0});
   }
  }
 }
 update(active){
  if(!active){if(this.active)for(const e of this.entries){e.mesh.geometry.attributes.position.array.set(e.source);e.mesh.geometry.attributes.position.needsUpdate=true;e.mesh.geometry.computeVertexNormals();e.mesh.geometry.computeBoundingSphere();}this.active=false;this.last=null;return;}
  this.active=true;
  for(const f of this.frames.values()){f.bone.updateWorldMatrix(true,false);f.delta.multiplyMatrices(f.bone.matrixWorld,f.inverse);f.surface.refresh();f.box=f.surface.tree.box.clone().applyMatrix4(f.surface.world);}
  const state=[...this.frames.values()].flatMap(f=>f.bone.matrixWorld.elements);
  if(this.last&&state.every((n,i)=>Math.abs(n-this.last[i])<1e-10))return;
  const started=performance.now();
  this.last=state;const shank=this.frames.get('Tibia.r'),v=new Vector3(),a=new Vector3();
  for(const e of this.entries){const inverse=e.mesh.matrixWorld.clone().invert(),attribute=e.mesh.geometry.attributes.position;e.maxDisplacement=0;e.corrections=0;
   for(let i=0;i<e.rest.length;i++){
    const p=e.rest[i],owner=e.owners[i],frame=this.frames.get(owner.name);
    if(owner.pin)v.copy(p).applyMatrix4(frame.delta);
    else{v.copy(p).applyMatrix4(shank.delta);a.copy(p).applyMatrix4(frame.delta);v.lerp(a,owner.weight);}
    // Do not rewrite the neutral source mesh. Free periarticular portions may
    // slide over a bone, but no middle vertex is stored as a bone attachment.
    if(!owner.pin&&p.y<.13&&owner.weight>0&&frame.delta.elements.some((n,j)=>Math.abs(n-shank.delta.elements[j])>1e-9)){
     for(let pass=0;pass<3;pass++){let changed=false;for(const [name,f] of this.frames){if(name==='Femur.r'||!f.box.containsPoint(v))continue;const local=v.clone().applyMatrix4(f.surface.inverse);if(!f.surface.insideLocal(local))continue;const hit=f.surface.nearestLocal(local);if(hit.distance<.0001)continue;
       const restLocal=p.clone().applyMatrix4(f.inverse),baseline=f.surface.insideLocal(restLocal)?f.surface.nearestLocal(restLocal).distance:0;
       if(hit.distance<=baseline+.00015)continue;
       const normal=hit.triangle.getNormal(new Vector3()).multiplyScalar(f.surface.normalSign);v.copy(hit.point).addScaledVector(normal,.00015).applyMatrix4(f.surface.world);e.corrections++;changed=true;
      }if(!changed)break;}
    }
    e.maxDisplacement=Math.max(e.maxDisplacement,p.distanceTo(v));v.applyMatrix4(inverse);attribute.setXYZ(i,v.x,v.y,v.z);
   }
   attribute.needsUpdate=true;e.mesh.geometry.computeVertexNormals();e.mesh.geometry.computeBoundingSphere();
  }
  this.updateMs=performance.now()-started;
 }
 snapshot(){return this.entries.map(e=>({name:e.name,vertices:e.rest.length,distal:e.distal,maxDisplacement:e.maxDisplacement,corrections:e.corrections,terminalPins:e.owners.filter(o=>o.pin).length}));}
 audit(){let terminalError=0,restError=0,finite=true;const v=new Vector3();for(const e of this.entries){e.mesh.updateWorldMatrix(true,false);const attr=e.mesh.geometry.attributes.position;for(let i=0;i<e.rest.length;i++){v.fromBufferAttribute(attr,i).applyMatrix4(e.mesh.matrixWorld);finite&&=Number.isFinite(v.lengthSq());if(e.owners[i].pin){const f=this.frames.get(e.owners[i].name),expected=e.rest[i].clone().applyMatrix4(f.delta);terminalError=Math.max(terminalError,v.distanceTo(expected));}restError=Math.max(restError,v.distanceTo(e.rest[i]));}}return {finite,terminalError,restError,updateMs:this.updateMs,entries:this.snapshot(),status:'source-preserving teaching deformation; not measured muscle force or validated footprints'};}
}
