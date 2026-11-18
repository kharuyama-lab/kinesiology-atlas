import {Vector3,Box3} from 'three';
import {ankleLigamentBase} from './ankle-ligament-base.js';
import {smoothLigamentBody} from './ankle-ligament-smoothing.js';

// Retain the approved PTFL temporal behavior over the cached route. Ordinary
// small steps need no collision solve; only large route changes use the existing
// bounded filter, with exact moving footprints and exterior contact clearance.
export function filterCachedPTFL(follower,state){
 const e=follower.entries.find(e=>e.name==='Posterior talofibular ligament.r');if(!e)return false;
 const now=performance.now(),dt=Math.min(.05,(now-(state.time||now))/1000),a=e.mesh.geometry.attributes.position,inverse=e.mesh.matrixWorld.clone().invert(),base=ankleLigamentBase(e),target=Array.from({length:a.count},(_,i)=>new Vector3().fromBufferAttribute(a,i).applyMatrix4(e.mesh.matrixWorld));state.time=now;
 let distance=0;if(state.positions)for(let i=0;i<target.length;i++)if(!e.anchors.has(i))distance=Math.max(distance,state.positions[i].clone().add(base[i]).sub(state.base[i]).distanceTo(target[i]));
 let result={positions:target,settling:false,distance};
 if(state.positions&&distance>.0003){
  const bounds=new Box3().setFromPoints([...base,...target,...state.positions]).expandByScalar(.02),surfaces=follower.surfaces.filter(surface=>{surface.refresh();return surface.tree.box.clone().applyMatrix4(surface.world).intersectsBox(bounds);}),proven=new WeakSet();
  const inside=point=>{for(const surface of surfaces){const local=point.clone().applyMatrix4(surface.inverse);if(surface.tree.box.containsPoint(local)&&surface.insideLocalStable(local)&&surface.nearestLocal(local).distance>.000025)return true;}return false;};
  const valid=points=>{if(proven.has(points))return true;for(let i=0;i<points.length;i++)if(!e.anchors.has(i)&&inside(points[i]))return false;for(const ids of e.faces)if(!ids.every(i=>e.anchors.has(i))&&inside(ids.reduce((p,i)=>p.add(points[i]),new Vector3()).multiplyScalar(1/3)))return false;proven.add(points);return true;};
  const escape=point=>{for(const surface of surfaces){const local=point.clone().applyMatrix4(surface.inverse);if(!surface.tree.box.containsPoint(local)||!surface.insideLocalStable(local))continue;const hit=surface.nearestLocal(local);if(hit.distance<=.000025)continue;const normal=hit.triangle.getNormal(new Vector3()).multiplyScalar(surface.normalSign),target=hit.point.clone().addScaledVector(normal,.00012);if(surface.insideLocalStable(target))target.copy(hit.point).addScaledVector(normal,-.00012);return target.applyMatrix4(surface.world);}return null;};
  result=smoothLigamentBody({previous:state.positions,previousBase:state.base,base,target,anchors:e.anchors,faces:e.faces,dt,valid,escape});
 }
 state.positions=result.positions;state.base=base;e.filterInfo={fallback:result.fallback||false,distance:result.distance||0};e.settling=!!result.settling;
 if(result.settling||result.positions!==target){for(let i=0;i<a.count;i++){const p=result.positions[i].clone().applyMatrix4(inverse);a.setXYZ(i,p.x,p.y,p.z);}a.needsUpdate=true;e.localNormalDirty=true;}
 return !!result.settling;
}
