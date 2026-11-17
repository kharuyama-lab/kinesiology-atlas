export function smoothLigamentBody({previous,previousBase,base,target,anchors,faces,dt,valid,escape}){
 if(!previous||!previousBase||dt>=1)return {positions:target,settling:false};
 const carried=previous.map((p,i)=>anchors.has(i)?base[i].clone():p.clone().add(base[i]).sub(previousBase[i]));
 const distance=Math.max(...carried.map((p,i)=>anchors.has(i)?0:p.distanceTo(target[i])));
 if(distance<.000005)return {positions:target,settling:false};
 const alpha=Math.min(1-Math.exp(-18*Math.max(0,dt)),.015*Math.max(0,dt)/distance);
 const positions=carried.map((p,i)=>anchors.has(i)?base[i].clone():p.clone().lerp(target[i],alpha));
 // Temporal interpolation may not lag inside a moving bone. Restore only
 // contact clearance; never add a midpoint attachment or interpolate anchors.
 if(!valid(positions))for(let pass=0;pass<16;pass++){
  for(let i=0;i<positions.length;i++)if(!anchors.has(i)){const point=escape(positions[i]);if(point)positions[i].copy(point);}
  for(const ids of faces){const center=ids.reduce((p,i)=>p.add(positions[i]),positions[0].clone().set(0,0,0)).multiplyScalar(1/3),point=escape(center);if(!point)continue;const free=ids.filter(i=>!anchors.has(i));if(free.length)for(const i of free)positions[i].addScaledVector(point.clone().sub(center),3/free.length);}
  if(valid(positions))break;
 }
 const changed=Math.max(...positions.map((p,i)=>anchors.has(i)?0:p.distanceTo(carried[i])));
 return valid(positions)?{positions,settling:changed>.000001,fallback:false,distance}:{positions:target,settling:false,fallback:true,distance};
}
