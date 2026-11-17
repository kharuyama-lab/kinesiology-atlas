import {Vector3,Matrix4,Box3} from 'three';
// Source-relative exclusion, including triangle interiors. A source footprint
// may already intersect a coarse bone; do not deepen it during movement.
export function resolveMuscleContact(entry,points,frames){
 const allFrames=frames,bounds=new Box3().setFromPoints(points).expandByScalar(.004);
 frames=new Map([...frames].filter(([,f])=>f.box.intersectsBox(bounds)));
 const index=entry.mesh.geometry.index;
 if(!entry.contactSamples){
  entry.contactSamples=entry.rest.map(rest=>({rest,baseline:new Map()}));entry.contactFaces=[];
  if(index)for(let i=0;i<index.count;i+=3){const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];entry.contactFaces.push({ids,rest:ids.reduce((p,j)=>p.add(entry.rest[j]),new Vector3()).multiplyScalar(1/3),baseline:new Map()});}
  entry.incidentFaces=entry.rest.map(()=>[]);entry.contactFaces.forEach((f,i)=>f.ids.forEach(j=>entry.incidentFaces[j].push(i)));
 }
 // A point and a bone sharing one rigid transform retain exactly the same
 // signed gap as their source. Skip that proven invariant, not a visibility
 // or distance heuristic. Re-enable the test if a contact correction moves it.
 const equivalent=new Map();for(const carrier of new Set(entry.owners.map(o=>o.carrier).filter(Boolean))){const transform=allFrames.get(carrier)?.delta;if(!transform)continue;equivalent.set(carrier,new Set([...allFrames].filter(([,f])=>f.delta&&f.delta.elements.every((n,i)=>Math.abs(n-transform.elements[i])<1e-9)).map(([name])=>name)));}
 const moved=new Set();
 const delta=(sample,point,skip)=>{
  let worst=0,move=null;
  for(const [name,f] of bounds.containsPoint(point)?frames:allFrames){if(skip?.has(name)||!f.box.containsPoint(point))continue;const local=point.clone().applyMatrix4(f.surface.inverse);if(!f.surface.insideLocal(local))continue;
   let baseline=sample.baseline.get(name);if(baseline===undefined){const rest=sample.rest.clone().applyMatrix4(f.inverse);baseline=f.surface.insideLocal(rest)?f.surface.nearestLocal(rest).distance:0;sample.baseline.set(name,baseline);}
   const hit=f.surface.nearestLocal(local),extra=hit.distance-baseline;if(extra<.000075||extra<=worst)continue;
   const normal=hit.triangle.getNormal(new Vector3()).multiplyScalar(f.surface.normalSign),target=hit.point.clone().addScaledVector(normal,.00015-Math.max(0,baseline-.00015));
   move=target.applyMatrix4(f.surface.world).sub(point);worst=extra;
  }
  for(const sheet of entry.activeLayerSheets||entry.layerSheets||[]){const contact=sheet.project(point);if(contact&&contact.depth>worst){move=contact.move;worst=contact.depth;}}
  return move;
 };
 const world=entry.mesh.matrixWorld,inverse=new Matrix4().copy(world).invert();
 const quantize=p=>{p.applyMatrix4(inverse);p.set(Math.fround(p.x),Math.fround(p.y),Math.fround(p.z));p.applyMatrix4(world);};
 let corrections=0;
 let vertexQueue=points.map((_,i)=>i),faceQueue=entry.contactFaces.map((_,i)=>i);
 for(let pass=0;pass<16;pass++){
  const changed=new Set(),faces=new Set(faceQueue);
  for(const i of vertexQueue){if(entry.owners[i].pin)continue;const move=delta(entry.contactSamples[i],points[i],moved.has(i)?null:equivalent.get(entry.owners[i].carrier));if(move){points[i].add(move);quantize(points[i]);moved.add(i);changed.add(i);for(const f of entry.incidentFaces[i])faces.add(f);corrections++;}}
  for(const id of faces){const sample=entry.contactFaces[id],free=sample.ids.filter(i=>!entry.owners[i].pin);if(!free.length)continue;const carrier=entry.owners[sample.ids[0]].carrier,skip=carrier&&sample.ids.every(i=>!moved.has(i)&&entry.owners[i].carrier===carrier)?equivalent.get(carrier):null;
   const center=sample.ids.reduce((p,j)=>p.add(points[j]),new Vector3()).multiplyScalar(1/3),move=delta(sample,center,skip);if(move){for(const j of free){points[j].addScaledVector(move,3/free.length);quantize(points[j]);moved.add(j);changed.add(j);}corrections++;}}
  if(!changed.size)break;
  vertexQueue=[...changed];faceQueue=[...new Set(vertexQueue.flatMap(i=>entry.incidentFaces[i]))];
 }
 return corrections;
}
