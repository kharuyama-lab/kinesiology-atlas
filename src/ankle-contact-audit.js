// A single parity ray can graze an edge of the source triangulation and flip
// its answer after a micron-scale displacement. Use the same five-direction
// majority check as PTFL QA. This is read-only; it changes no rendered geometry.
import {Vector3} from 'three';
export function stableContactAudit(follower,names=null){
 const frames=new Map([...follower.frames].map(([name,frame])=>{
  const surface=Object.create(frame.surface);
  surface.insideLocal=point=>frame.surface.insideLocalStable(point);
  return [name,{...frame,surface}];
 }));
 return follower.contactAudit.call({...follower,frames},names);
}
export function stableLayerAudit(follower){
 const entries=[...follower.entries,...follower.staticEntries].map(entry=>({...entry,layerSheets:entry.layerSheets.map(sheet=>{
  const proxy=Object.create(sheet);
  proxy.project=point=>{
   const hit=sheet.project(point);if(!hit)return null;
   const n=hit.move.clone().normalize(),u=new Vector3().crossVectors(n,Math.abs(n.y)<.9?new Vector3(0,1,0):new Vector3(1,0,0)).normalize(),v=new Vector3().crossVectors(n,u);
   // Ignore only a five-micron silhouette ambiguity, not a penetration depth.
   for(const direction of [u,v])for(const sign of [-1,1])if(!sheet.project(point.clone().addScaledVector(direction,sign*.000005)))return null;
   return hit;
  };return proxy;
 })}));
 return follower.layerAudit.call({...follower,entries,staticEntries:[]});
}
export function stableLigamentAudit(follower){
 const surfaces=follower.surfaces.map(surface=>{
  const proxy=Object.create(surface);proxy.insideLocal=point=>surface.insideLocalStable(point);proxy.insideLocalStable=point=>surface.insideLocalStable(point);return proxy;
 });
 return follower.audit.call({...follower,surfaces});
}
