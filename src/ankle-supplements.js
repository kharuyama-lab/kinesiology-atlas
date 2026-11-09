import {Vector3,Triangle,Group,Mesh,MeshStandardMaterial,SphereGeometry,BufferGeometry,Float32BufferAttribute} from 'three';
import {ankleSupplements,ankleReviewLandmarks} from '../config/ankle-supplements.js';

// Clip the actual surface triangle to a proposed anatomical region. Filtering
// only its unconstrained closest point can falsely report an empty region.
function regionPoint(face,surface,seed,region){
 let polygon=[face.triangle.a,face.triangle.b,face.triangle.c].map(p=>p.clone().applyMatrix4(surface.world));
 for(const [axis,[lo,hi]] of Object.entries(region))for(const [limit,sign] of [[lo,1],[hi,-1]]){
  const next=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],da=sign*(a[axis]-limit),db=sign*(b[axis]-limit);if(da>=0)next.push(a);if((da>=0)!==(db>=0))next.push(a.clone().lerp(b,da/(da-db)));}polygon=next;if(polygon.length<3)return null;
 }
 let best=null,distance=Infinity;for(let i=1;i<polygon.length-1;i++){const p=new Triangle(polygon[0],polygon[i],polygon[i+1]).closestPointToPoint(seed,new Vector3()),d=p.distanceToSquared(seed);if(d<distance){best=p;distance=d;}}return best;
}

// Static review geometry only. No modification of raw source meshes, axes,
// existing followers or tension rules. Footprints are projected onto real bone
// triangles; anatomical locations remain review estimates, not registered scans.
export function createAnkleSupplements(bones){
 const fibula=bones.get('Fibula.r'),all=[...bones.values()],vertices=fibula.faces.flatMap(f=>[f.triangle.a,f.triangle.b,f.triangle.c].map(p=>p.clone().applyMatrix4(fibula.world))),tip=vertices.reduce((a,b)=>a.y<b.y?a:b).clone();
 let collision=null;const outside=(p,owner=null,tolerance=.000025)=>!all.some(s=>{if(s===owner)return false;const q=p.clone().applyMatrix4(s.inverse),bad=s.tree.box.containsPoint(q)&&s.insideLocal(q)&&s.nearestLocal(q).distance>tolerance;if(bad)collision={bone:s.bone.userData.za_name,p:p.toArray(),depth:s.nearestLocal(q).distance};return bad;});
 function fit(seed,surface,normalPreference,region=null,minDot=.65){
  const local=seed.clone().applyMatrix4(surface.inverse),candidates=surface.faces.map(f=>{
   const p=region?regionPoint(f,surface,seed,region):f.triangle.closestPointToPoint(local,new Vector3()).applyMatrix4(surface.world);if(!p)return null;const n=f.triangle.getNormal(new Vector3()).multiplyScalar(surface.normalSign).transformDirection(surface.world);
   return {p,n,surface,triangle:f.triangle,score:p.distanceToSquared(seed),facing:!normalPreference||n.dot(normalPreference.clone().normalize())>minDot};
  }).filter(c=>c&&c.facing&&outside(c.p,surface));
  candidates.sort((a,b)=>a.score-b.score);if(!candidates.length)throw Error('No exposed attachment surface: '+surface.bone.userData.za_name+' '+JSON.stringify(region));return candidates[0];
 }
 const entries=[];
 for(const spec of ankleSupplements){
  const distal=bones.get(spec.bone),seed=tip.clone().add(new Vector3(...spec.fibularOffset));
  const a=fit(seed,fibula,spec.fibularSide==='anterior'?new Vector3(0,0,1):new Vector3(1,0,0),spec.fibularRegion,spec.id==='CFL'?.3:.65),b=fit(new Vector3(...spec.distalSeed),distal,spec.id==='PTFL'?new Vector3(0,-.4,-1):spec.id==='ATFL'?new Vector3(-.5,0,.866):new Vector3(-1,0,0),spec.distalRegion);
  const axis=b.p.clone().sub(a.p).normalize(),outward=new Vector3(...spec.outward).normalize(),side=new Vector3().crossVectors(axis,outward).normalize(),rows=48,cols=8,anchors=new Map(),base=[],indices=[],handle=Math.min(.004,a.p.distanceTo(b.p)*.25);
  for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){
   const t=r/rows,sectionWidth=r===0&&spec.proximalFootprintWidth?spec.proximalFootprintWidth:r===rows&&spec.distalFootprintWidth?spec.distalFootprintWidth:spec.width*(.8+.2*Math.sin(Math.PI*t)),lateral=(c/cols-.5)*sectionWidth;let p;
   if(r===0||r===rows){const end=r===0?a:b,footSide=r===rows&&spec.distalFanDirection?new Vector3(...spec.distalFanDirection).addScaledVector(end.n,-new Vector3(...spec.distalFanDirection).dot(end.n)).normalize():side,foot=fit(end.p.clone().addScaledVector(footSide,lateral),end.surface,end.n);p=foot.p;anchors.set(base.length,foot);}
   else p=a.p.clone().multiplyScalar((1-t)**3).addScaledVector(a.p.clone().addScaledVector(a.n,handle),3*(1-t)**2*t).addScaledVector(b.p.clone().addScaledVector(b.n,handle),3*(1-t)*t*t).addScaledVector(b.p,t**3).addScaledVector(side,lateral);
   base.push(p);
  }
  // Each fibre connects its own footprint rather than a central origin.
  for(let c=0;c<=cols;c++){const fa=anchors.get(c),fb=anchors.get(rows*(cols+1)+c);for(let r=1;r<rows;r++){const t=r/rows;base[r*(cols+1)+c]=fa.p.clone().multiplyScalar((1-t)**3).addScaledVector(fa.p.clone().addScaledVector(fa.n,handle),3*(1-t)**2*t).addScaledVector(fb.p.clone().addScaledVector(spec.id==='PTFL'?fb.n.clone().setY(Math.max(0,fb.n.y)).normalize():fb.n,spec.id==='PTFL'?Math.min(handle,.002):handle),3*(1-t)*t*t).addScaledVector(fb.p,t**3);}}
  // Fan fibres interpolate between the complete footprint rows around one
  // common curved centreline. Independent face normals would create a bulb
  // in the middle, concealing the intended proximal-to-distal spread.
  if(spec.shape==='fan'&&spec.id==='ATFL')for(let r=1;r<rows;r++){const t=r/rows,normal=spec.id==='PTFL'?b.n.clone().setY(Math.max(0,b.n.y)).normalize():b.n,center=a.p.clone().multiplyScalar((1-t)**3).addScaledVector(a.p.clone().addScaledVector(a.n,handle),3*(1-t)**2*t).addScaledVector(b.p.clone().addScaledVector(normal,spec.id==='PTFL'?Math.min(handle,.002):handle),3*(1-t)*t*t).addScaledVector(b.p,t**3);const edge=Math.min(1,Math.min(t,1-t)/.15),blend=edge*edge*(3-2*edge);for(let c=0;c<=cols;c++){const fan=center.clone().addScaledVector(anchors.get(c).p.clone().sub(a.p),1-t).addScaledVector(anchors.get(rows*(cols+1)+c).p.clone().sub(b.p),t);base[r*(cols+1)+c].lerp(fan,blend);}}
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const i=r*(cols+1)+c;indices.push(i,i+1,i+cols+1,i+1,i+cols+2,i+cols+1);}
  const build=height=>base.map((p,i)=>{if(anchors.has(i))return p.clone();const t=Math.floor(i/(cols+1))/rows,c=i%(cols+1),direction=spec.id==='PTFL'?outward.clone().lerp(anchors.get(rows*(cols+1)+c).n.clone().setY(Math.max(0,(spec.shape==='fan'?b.n:anchors.get(rows*(cols+1)+c).n).y)).normalize(),t*t).normalize():outward;return p.clone().addScaledVector(direction,Math.sqrt(Math.sin(Math.PI*t))*height);});
  const valid=ps=>ps.every((p,i)=>anchors.has(i)||outside(p))&&indices.every((_,i)=>i%3||outside(ps[indices[i]].clone().add(ps[indices[i+1]]).add(ps[indices[i+2]]).divideScalar(3)));
  let height=0,positions=build(0);for(;height<.025&&!valid(positions);height+=.00025)positions=build(height+.00025);
  const routeValid=valid(positions);if(!routeValid)throw Error(spec.id+': static route could not clear bones '+JSON.stringify({a:a.p.toArray(),b:b.p.toArray(),collision}));
  const geometry=new BufferGeometry().setAttribute('position',new Float32BufferAttribute(positions.flatMap(p=>p.toArray()),3)).setIndex(indices);geometry.computeVertexNormals();
  const group=new Group(),mesh=new Mesh(geometry,new MeshStandardMaterial({color:0x82b9e1,roughness:.7,side:2}));mesh.userData.za_name=spec.name;group.add(mesh);
  for(const [end,f] of [['腓骨',a],[spec.bone==='Talus.r'?'距骨':'踵骨',b]]){const marker=new Mesh(new SphereGeometry(.00065,12,8),new MeshStandardMaterial({color:0xf4f8ff,roughness:.5}));marker.position.copy(f.p);marker.userData.label=spec.jp+'：'+end+'付着部（推定）';group.add(marker);}
  const actual=positions.map((_,i)=>new Vector3().fromBufferAttribute(geometry.attributes.position,i)),gap=Math.max(...[...anchors].map(([i,f])=>f.surface.nearest(actual[i]).distance)),depth=p=>Math.max(0,...all.map(s=>-s.signedDistance(p)));let maxBodyPenetration=0,maxFacePenetration=0;for(let i=0;i<actual.length;i++)if(!anchors.has(i))maxBodyPenetration=Math.max(maxBodyPenetration,depth(actual[i]));for(let i=0;i<indices.length;i+=3)maxFacePenetration=Math.max(maxFacePenetration,depth(actual[indices[i]].clone().add(actual[indices[i+1]]).add(actual[indices[i+2]]).divideScalar(3)));
  const rowWidths=Array.from({length:rows+1},(_,r)=>actual[r*(cols+1)].distanceTo(actual[r*(cols+1)+cols]));
  entries.push({shape:spec.shape||'band',proximalWidth:rowWidths[0],distalWidth:rowWidths[rows],widthRatio:rowWidths[rows]/rowWidths[0],rowWidths,name:spec.name,jp:spec.jp,id:spec.id,node:group,mesh,a:a.p.toArray(),b:b.p.toArray(),bones:['Fibula.r',spec.bone],fibularTip:tip.toArray(),span:a.p.distanceTo(b.p),width:spec.width,routeHeight:height,routeValid,maxBodyPenetration,maxFacePenetration,maxFootprintGap:gap,source:'original schematic supplement; static review only',anatomicalStatus:'estimated model landmarks; awaiting user review'});
 }
 entries.landmarks=ankleReviewLandmarks.map(r=>{const surface=bones.get(r.bone),p=r.id==='F0'?tip.clone():fit(new Vector3(...r.seed),surface,new Vector3(...r.normal)).p;return {...r,point:p.toArray(),surfaceGap:surface.nearest(p).distance,status:'proposed landmark; anatomical review pending'};});
 return entries;
}
