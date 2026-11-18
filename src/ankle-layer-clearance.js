import {Vector3} from 'three';

// Small interpolation cleanup only. No bone search or whole-muscle route solve.
// Terminal collars remain fixed. Test triangle interiors as well as vertices.
export function clearInterpolatedLayers(entry){
 entry.layerCorrectionMax=0;
 entry.layerMoved=new Set();
 entry.layerBoneVertices=new Set();
 if(!entry.layerSheets.length||entry.name==='Calcaneal tendon.r')return 0;
 const a=entry.mesh.geometry.attributes.position,index=entry.mesh.geometry.index,world=entry.mesh.matrixWorld,inverse=world.clone().invert(),p=new Vector3(),q=new Vector3();let corrections=0;
 const distances=new Float32Array(a.count),scale=world.getMaxScaleOnAxis();
 const project=point=>{let move=null,depth=.0000001;for(const sheet of entry.layerSheets){const hit=sheet.project(point);if(hit&&hit.depth>depth){depth=hit.depth;move=hit.move;}}return move;};
 const write=(i,point)=>{point.applyMatrix4(inverse);const x=Math.fround(point.x),y=Math.fround(point.y),z=Math.fround(point.z),changed=x!==a.getX(i)||y!==a.getY(i)||z!==a.getZ(i);if(changed){distances[i]+=Math.hypot(x-a.getX(i),y-a.getY(i),z-a.getZ(i))*scale;if(distances[i]>.00015)entry.layerBoneVertices.add(i);a.setXYZ(i,x,y,z);entry.layerMoved.add(i);}return changed;};
 for(let pass=0;pass<4;pass++){
  let changed=false;
  for(const i of entry.layerCandidates?.vertices||Array.from({length:a.count},(_,i)=>i)){
   if(entry.owners[i].pin||entry.rest[i].y>.15)continue;
   p.fromBufferAttribute(a,i).applyMatrix4(world);const move=project(p);if(move&&write(i,p.add(move))){entry.layerCorrectionMax=Math.max(entry.layerCorrectionMax,move.length());changed=true;corrections++;}
  }
  if(index)for(const face of entry.layerCandidates?.faces||Array.from({length:index.count/3},(_,i)=>i)){const k=face*3,ids=[index.getX(k),index.getX(k+1),index.getX(k+2)];if(ids.every(i=>entry.owners[i].pin)||ids.every(i=>entry.rest[i].y>.15))continue;
   p.set(0,0,0);for(const i of ids)p.add(q.fromBufferAttribute(a,i).applyMatrix4(world));p.multiplyScalar(1/3);const move=project(p);if(!move)continue;
   const free=ids.filter(i=>!entry.owners[i].pin);let touched=false;for(const i of free)if(write(i,q.fromBufferAttribute(a,i).applyMatrix4(world).addScaledVector(move,3/free.length)))touched=true;if(touched){entry.layerCorrectionMax=Math.max(entry.layerCorrectionMax,move.length()*3/free.length);changed=true;corrections++;}
  }
  if(!changed)break;
 }
 if(corrections){entry.cacheDirty=true;entry.localNormalDirty=true;a.needsUpdate=true;}return corrections;
}

export function collectLayerCandidates(entry){
 if(!entry.layerSheets.length||entry.name==='Calcaneal tendon.r')return;
 const a=entry.mesh.geometry.attributes.position,index=entry.mesh.geometry.index,p=new Vector3(),q=new Vector3(),world=entry.mesh.matrixWorld;
 entry.layerCandidates||={vertices:new Set(),faces:new Set()};entry.layerSeeds||=new Set();
 const close=point=>entry.layerSheets.some(sheet=>sheet.project(point,.003));
 for(let i=0;i<a.count;i++)if(!entry.owners[i].pin&&entry.rest[i].y<.15&&close(p.fromBufferAttribute(a,i).applyMatrix4(world))){entry.layerCandidates.vertices.add(i);entry.layerSeeds.add(i);}
 if(index)for(let k=0;k<index.count;k+=3){const ids=[index.getX(k),index.getX(k+1),index.getX(k+2)];if(ids.every(i=>entry.owners[i].pin)||ids.every(i=>entry.rest[i].y>.15))continue;p.set(0,0,0);for(const i of ids)p.add(q.fromBufferAttribute(a,i).applyMatrix4(world));if(close(p.multiplyScalar(1/3))||ids.some(i=>entry.layerSeeds.has(i))){entry.layerCandidates.faces.add(k/3);for(const i of ids)if(!entry.owners[i].pin)entry.layerCandidates.vertices.add(i);}}
}

// Offline conservative candidate collection. Expand only a collision-sheet
// footprint; never expand the rendered ligament or alter its attachments.
export function expandLayerFootprint(sheet,margin=.00025){
 for(const face of sheet.faces){const center=face.triangle.getMidpoint(new Vector3());for(const point of [face.triangle.a,face.triangle.b,face.triangle.c])point.addScaledVector(point.clone().sub(center).normalize(),margin);face.box.setFromPoints([face.triangle.a,face.triangle.b,face.triangle.c]);}
 const refit=node=>{node.box.makeEmpty();if(node.faces)for(const face of node.faces)node.box.union(face.box);else{refit(node.left);refit(node.right);node.box.union(node.left.box).union(node.right.box);}};refit(sheet.tree);sheet.box.copy(sheet.tree.box).expandByScalar(.008);
}
