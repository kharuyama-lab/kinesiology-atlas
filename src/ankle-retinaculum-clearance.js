import {Vector3,Mesh,BufferGeometry} from '../vendor/three/build/three.module.js';
import {TissueSheet} from './ankle-tissue-sheet.js';

// Only the distal source region can pass beneath ankle retinacula. Refit that
// region, including interpolation between cached poses; never rerun bone routing.
export function clearRetinaculumCoverage(retinacula,changed,sheets){
 const needed=new Set(retinacula.entries.flatMap(e=>e.covers));
 changed=changed.filter(e=>needed.has(e.name));
 if(!changed.length)return;
 for(const e of changed){let sheet=sheets.get(e.mesh);if(!sheet){
   const index=e.mesh.geometry.index,ids=[];for(let k=0;k<index.count;k+=3){const face=[index.getX(k),index.getX(k+1),index.getX(k+2)];if(face.some(i=>e.rest[i].y<.20&&e.rest[i].z<.12))ids.push(...face);}
   const geometry=new BufferGeometry().setAttribute('position',e.mesh.geometry.attributes.position).setIndex(ids),mesh=new Mesh(geometry);mesh.matrixAutoUpdate=false;mesh.matrix.copy(e.mesh.matrixWorld);sheet=new TissueSheet(mesh);sheets.set(e.mesh,sheet);
  }else{sheet.mesh.matrix.copy(e.mesh.matrixWorld);sheet.update();}}
 const p=new Vector3(),q=new Vector3(),normal=new Vector3();
 for(const e of retinacula.entries){const covered=changed.filter(m=>e.covers.includes(m.name));if(!covered.length)continue;
  const a=e.mesh.geometry.attributes.position,index=e.mesh.geometry.index,world=e.mesh.matrixWorld,inverse=world.clone().invert(),normals=e.bindings.map(b=>b.normal.clone().transformDirection(b.first.delta));
  const moveAt=(point,n)=>{let depth=0;for(const m of covered){const sheet=sheets.get(m.mesh);if(sheet.tree.box.distanceToPoint(point)>.012)continue;const hit=sheet.outerHit(point,n);if(hit){const d=hit.sub(point).dot(n)+.0005;if(d>depth&&d<.012)depth=d;}}return depth>1e-8?n.clone().multiplyScalar(depth):null;};
  const write=(i,point)=>{point.applyMatrix4(inverse);a.setXYZ(i,point.x,point.y,point.z);};
  for(let pass=0;pass<4;pass++){let touched=false;
   for(let i=0;i<a.count;i++)if(!e.bindings[i].pin){p.fromBufferAttribute(a,i).applyMatrix4(world);const move=moveAt(p,normals[i]);if(move){write(i,p.add(move));touched=true;}}
   if(index)for(let k=0;k<index.count;k+=3){const ids=[index.getX(k),index.getX(k+1),index.getX(k+2)],free=ids.filter(i=>!e.bindings[i].pin);if(!free.length)continue;p.set(0,0,0);normal.set(0,0,0);for(const i of ids){p.add(q.fromBufferAttribute(a,i).applyMatrix4(world));normal.add(normals[i]);}p.multiplyScalar(1/3);normal.normalize();const move=moveAt(p,normal);if(move){for(const i of free)write(i,q.fromBufferAttribute(a,i).applyMatrix4(world).addScaledVector(move,3/free.length));touched=true;}}
   if(!touched)break;e.cacheDirty=true;e.localNormalDirty=true;a.needsUpdate=true;
  }
 }
}
