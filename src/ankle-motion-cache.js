import {Vector3,Box3,Sphere} from 'three';
import {TissueSheet} from './ankle-tissue-sheet.js';
import {ankleMuscleWeight} from './ankle-muscle-follow.js';
import {ankleCalf} from '../config/ankle-muscles.js';
import {clearInterpolatedLayers} from './ankle-layer-clearance.js';
import {resolveMuscleContact} from './ankle-muscle-contact.js';
import {AsyncRetinaculumCoverage} from './ankle-retinaculum-async.js';
import {filterCachedPTFL} from './ankle-ptfl-filter.js';

// The approved ankle motions each have one degree of freedom. Resolve contact
// offline on a dense angular grid; interpolate it with bounded local clearance.
// Bone rotations, terminal footprints and the free Achilles remain analytical.
export class AnkleMotionCache {
 constructor(ligaments,muscles,retinacula,{audit=false}={}){
  this.ligaments=ligaments;this.muscles=muscles;this.retinacula=retinacula;
  this.audit=audit;
  this.ptflState={};
  this.entries=[...ligaments.entries,...muscles.entries,...muscles.staticEntries,...retinacula.entries];
 }
 async load(){
  const meta=await fetch('assets/ankle-motion/cache.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Ankle motion cache unavailable');return r.json();});
  if(meta.entries.length!==this.entries.length||meta.entries.some((e,i)=>e.name!==this.entries[i].name||e.length!==this.entries[i].mesh.geometry.attributes.position.array.length))throw Error('Ankle motion cache geometry mismatch');
  const response=await fetch('assets/ankle-motion/positions.bin.gz?v='+(meta.contentHash||meta.version));if(!response.ok)throw Error('Ankle motion data unavailable');
  this.meta=meta;this.stride=meta.entries.reduce((n,e)=>n+e.length,0);
  meta.entries.forEach((entry,i)=>{if(entry.contacts)this.entries[i].layerCandidates=entry.contacts;});
  const buffer=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  if(meta.encoding!=='float32-neutral-int16-temporal-delta'||buffer.byteLength!==meta.bytes)throw Error('Invalid ankle motion encoding');
  this.base=new Float32Array(buffer,0,this.stride);this.data=new Int16Array(buffer,this.stride*4);
  if(this.data.length!==meta.samples*this.stride)throw Error('Incomplete ankle motion data');
  for(let i=this.stride;i<this.data.length;i++)this.data[i]+=this.data[i-this.stride];
  if(meta.normalHash){
   const response=await fetch('assets/ankle-motion/normals.bin.gz?v='+meta.normalHash);if(!response.ok)throw Error('Ankle normal data unavailable');
   this.normalData=new Int8Array(await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
   if(this.normalData.length!==meta.normalBytes)throw Error('Incomplete ankle normal data');
   for(let i=this.stride;i<this.normalData.length;i++)this.normalData[i]+=this.normalData[i-this.stride];
  }
  meta.entries.forEach((entry,i)=>{if(entry.bounds){const box=new Box3(new Vector3(...entry.bounds.min),new Vector3(...entry.bounds.max)).expandByScalar(.03);this.entries[i].cacheBounds=box;this.entries[i].cacheSphere=box.getBoundingSphere(new Sphere());}});
  if(meta.localClearance)this.retAsync=new AsyncRetinaculumCoverage(this.retinacula,this.muscles);
  // The coarse upper gastrocnemius surface already intersects the tibial
  // envelope in a few triangle interiors. Keep those free (not new anchors),
  // but prevent whole-belly excursion from deepening that source overlap.
  const tibia=this.muscles.frames.get('Tibia.r'),center=new Vector3();
  for(const e of this.muscles.entries){e.boneCandidates=new Set();if(e.tendon||!/head of gastrocnemius/.test(e.name))continue;
   const index=e.mesh.geometry.index,lower=e.excursion.hi-e.excursion.span*.3;
   for(let k=0;k<index.count;k+=3){const ids=[index.getX(k),index.getX(k+1),index.getX(k+2)];center.set(0,0,0);for(const i of ids)center.add(e.rest[i]);center.multiplyScalar(1/3);if(center.y<lower)continue;center.applyMatrix4(tibia.inverse);if(tibia.surface.tree.box.containsPoint(center)&&tibia.surface.insideLocalStable(center)&&tibia.surface.nearestLocal(center).distance>.002)for(const i of ids)if(!e.owners[i].pin)e.boneCandidates.add(i);
   }
  }
  this.ready=true;
 }
 update(kind,value){
  if(!this.ready)return;
  const key=kind+':'+value;if(this.key===key&&!this.ptflSettling){this.retAsync?.apply();return;}this.key=key;const start=performance.now();
  const range=this.meta.motions[kind],f=Math.max(0,Math.min(range.count-1,(value-range.min)/range.step)),lo=Math.floor(f),hi=Math.min(range.count-1,lo+1),t=f-lo;
  let a=(range.offset+lo)*this.stride,b=(range.offset+hi)*this.stride,offset=0;
  for(const e of this.entries){const g=e.mesh.geometry,p=g.attributes.position;e.cacheDirty=false;e.localNormalDirty=false;
   if(this.normalData&&!g.attributes.normal)g.computeVertexNormals();const normal=g.attributes.normal;
   for(let i=0;i<p.array.length;i++){const next=Math.fround(this.base[offset+i]+(this.data[a+i]*(1-t)+this.data[b+i]*t)*this.meta.quantum);if(p.array[i]!==next)e.cacheDirty=true;p.array[i]=next;if(this.normalData)normal.array[i]=(this.normalData[a+i]*(1-t)+this.normalData[b+i]*t)/127;}
   if(this.normalData)normal.needsUpdate=e.cacheDirty;
   a+=p.array.length;b+=p.array.length;offset+=p.array.length;p.needsUpdate=true;
  }
  const muscles=this.muscles;
  for(const frame of muscles.frames.values()){frame.bone.updateWorldMatrix(true,false);frame.delta.multiplyMatrices(frame.bone.matrixWorld,frame.inverse);if(this.audit){frame.surface.refresh();frame.box=frame.surface.tree.box.clone().applyMatrix4(frame.surface.world);}}
  muscles.achilles.update(muscles.frames.get('Tibia.r').delta,muscles.frames.get('Calcaneus.r').delta);
  const shank=muscles.frames.get('Tibia.r').delta;
  if(this.audit)for(const [name,excursion] of muscles.excursions){const e=muscles.entries.find(e=>e.name===name);excursion.update({shank,pose:point=>{
   // Same source course used when generating the cache; these few guide points
   // provide excursion readouts without running mesh contact tests.
   return point.clone().applyMatrix4(shank).lerp(point.clone().applyMatrix4(muscles.frames.get(e.distal).delta),ankleMuscleWeight(name,point));
  },tendonPose:ankleCalf(name)?point=>muscles.achilles.tendon(point):null});}
  const p=new Vector3();
  // Pin footprints exactly to their own bone, including between grid samples.
  for(const e of this.ligaments.entries){const attribute=e.mesh.geometry.attributes.position,inverse=e.mesh.matrixWorld.clone().invert();
   for(const [i,anchor] of e.anchors){p.copy(anchor.local).applyMatrix4(anchor.bone.matrixWorld).applyMatrix4(inverse);attribute.setXYZ(i,p.x,p.y,p.z);}
   e.routeValid=true;e.settling=false;
  }
  this.ptflSettling=filterCachedPTFL(this.ligaments,this.ptflState);
  for(const e of muscles.entries){const attribute=e.mesh.geometry.attributes.position,inverse=e.mesh.matrixWorld.clone().invert();
   for(let i=0;i<e.rest.length;i++){
    if(e.owners[i].pin)p.copy(e.rest[i]).applyMatrix4(muscles.frames.get(e.owners[i].name).delta);
    else if(e.name==='Calcaneal tendon.r')muscles.achilles.tendon(e.rest[i],p);
    else continue;
    p.applyMatrix4(inverse);attribute.setXYZ(i,p.x,p.y,p.z);
   }
   if(this.audit&&value===0&&!e.neutralReference)e.neutralReference=Array.from({length:attribute.count},(_,i)=>new Vector3().fromBufferAttribute(attribute,i).applyMatrix4(e.mesh.matrixWorld));
  }
  for(const e of this.retinacula.entries){const attribute=e.mesh.geometry.attributes.position,inverse=e.mesh.matrixWorld.clone().invert();for(let i=0;i<e.rest.length;i++)if(e.bindings[i].pin){p.copy(e.rest[i]).applyMatrix4(e.bindings[i].first.delta).applyMatrix4(inverse);attribute.setXYZ(i,p.x,p.y,p.z);}}
  const clearanceStarted=performance.now();let sheetMs=0,layerMs=0,retMs=0;
  if(this.meta.localClearance){
   for(const sheet of muscles.layerSheets)sheet.update();
   sheetMs=performance.now()-clearanceStarted;const layerStarted=performance.now();
   const changed=[...muscles.entries,...muscles.staticEntries];for(const e of changed)clearInterpolatedLayers(e);
   const moved=changed.filter(e=>e.layerBoneVertices.size||e.boneCandidates?.size);
   if(moved.length){
    const frames=new Map([...muscles.frames].map(([name,f])=>{f.surface.refresh();f.box=f.surface.tree.box.clone().applyMatrix4(f.surface.world);const surface=Object.create(f.surface);surface.insideLocal=point=>f.surface.insideLocalStable(point);return [name,{...f,surface}];}));
    for(const e of moved){const vertices=new Set([...e.layerBoneVertices,...e.boneCandidates||[]]),a=e.mesh.geometry.attributes.position,inverse=e.mesh.matrixWorld.clone().invert(),points=Array.from({length:a.count},(_,i)=>new Vector3().fromBufferAttribute(a,i).applyMatrix4(e.mesh.matrixWorld));for(const i of vertices)e.owners[i].carrier=null;const corrections=resolveMuscleContact(e,points,frames,{vertices,maxPasses:4,layerTolerance:.0000001});if(corrections)e.localNormalDirty=true;for(let i=0;i<points.length;i++){p.copy(points[i]).applyMatrix4(inverse);a.setXYZ(i,p.x,p.y,p.z);}}
   }
   layerMs=performance.now()-layerStarted;const retStarted=performance.now();
   this.retAsync?.submit(kind,value);
   retMs=performance.now()-retStarted;
  }
  const normalStarted=performance.now();
  for(const e of this.entries){const g=e.mesh.geometry;if(e.localNormalDirty||!this.normalData&&e.cacheDirty)g.computeVertexNormals();if(e.cacheSphere){g.boundingSphere||=new Sphere();g.boundingBox||=new Box3();g.boundingSphere.copy(e.cacheSphere);g.boundingBox.copy(e.cacheBounds);}else if(e.cacheDirty)g.computeBoundingSphere();}
  this.retAsync?.apply();
  muscles.active=true;this.retinacula.active=true;this.ligaments.settling=!!this.ptflSettling;
  if(this.audit)for(const surface of this.ligaments.surfaces)surface.refresh();
  this.updateMs=performance.now()-start;
  this.timings={baseMs:clearanceStarted-start,sheetMs,layerMs,retMs,normalMs:performance.now()-normalStarted};
  muscles.updateMs=this.updateMs;
 }
 refreshAudit(){
  for(const sheet of this.muscles.layerSheets)sheet.update();
  const needed=new Set(this.retinacula.entries.flatMap(e=>e.covers));
  for(const name of needed)for(const mesh of this.retinacula.getMeshes(name)){
   let sheet=this.retinacula.muscleSheets.get(mesh);
   if(sheet)sheet.update();else this.retinacula.muscleSheets.set(mesh,new TissueSheet(mesh));
  }
 }
 refreshReadouts(){
  const p=new Vector3();for(const e of this.muscles.entries){const a=e.mesh.geometry.attributes.position;e.maxDisplacement=0;for(let i=0;i<e.rest.length;i++){p.fromBufferAttribute(a,i).applyMatrix4(e.mesh.matrixWorld);e.maxDisplacement=Math.max(e.maxDisplacement,p.distanceTo(e.rest[i]));}}
 }
 reset(){
  if(!this.ready||this.key===null)return;
  let offset=0;
  for(const e of this.ligaments.entries){const g=e.mesh.geometry,a=g.attributes.position;a.array.set(this.base.subarray(offset,offset+a.array.length));offset+=a.array.length;a.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();}
  this.key=null;
  this.ptflState={};this.ptflSettling=false;
  this.retAsync?.suspend();
 }
 dispose(){this.retAsync?.dispose();}
}
