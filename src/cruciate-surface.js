import {BufferGeometry,Float32BufferAttribute,Vector3,Quaternion} from 'three';
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};

// A presentation surface fitted to the source attachment centres and section
// widths. This is not a subject-specific ligament or a force/strain solver.
export function createCruciateSurface(points,proximal,distal,{rings=33,sides=20}={}){
 const axis=distal.clone().sub(proximal),length2=axis.lengthSq(),direction=axis.clone().normalize();
 let u=new Vector3(1,0,0).addScaledVector(direction,-direction.x).normalize();if(u.lengthSq()<.5)u=new Vector3(0,0,1).cross(direction).normalize();
 let v=new Vector3().crossVectors(direction,u).normalize();
 const samples=points.map(p=>({p,t:p.clone().sub(proximal).dot(axis)/length2}));
 const middle=samples.filter(p=>p.t>.3&&p.t<.7),centre=middle.reduce((c,s)=>c.add(s.p),new Vector3()).multiplyScalar(1/(middle.length||1));
 let xx=0,xy=0,yy=0;for(const s of middle){const r=s.p.clone().sub(centre),x=r.dot(u),y=r.dot(v);xx+=x*x;xy+=x*y;yy+=y*y;}
 const angle=.5*Math.atan2(2*xy,xx-yy),width=u.clone().multiplyScalar(Math.cos(angle)).addScaledVector(v,Math.sin(angle));u=width;v=new Vector3().crossVectors(direction,u).normalize();
 const section=t=>{
  let region=samples.filter(s=>Math.abs(s.t-t)<.14);if(region.length<3)region=samples;
  const c=region.reduce((c,s)=>c.add(s.p),new Vector3()).multiplyScalar(1/region.length);
  const extent=basis=>{const values=region.map(s=>s.p.clone().sub(c).dot(basis));return (Math.max(...values)-Math.min(...values))/2;};
  return {u:Math.max(.0008,extent(u)),v:Math.max(.0006,extent(v))};
 };
 const ends=[section(0),section(1)],body=section(.5);
 // Keep a broad, flat ligament section and avoid fitting source-course bends
 // as if they were tissue thickness.
 body.u=Math.min(body.u,Math.min(ends[0].u,ends[1].u));body.v=Math.min(body.v,body.u*.55);
 const radii=t=>{const a=1-smooth(t/.32),b=smooth((t-.68)/.32);return {u:body.u+(ends[0].u-body.u)*a+(ends[1].u-body.u)*b,v:body.v+(ends[0].v-body.v)*a+(ends[1].v-body.v)*b};};
 const count=rings*sides+2,geometry=new BufferGeometry().setAttribute('position',new Float32BufferAttribute(new Float32Array(count*3),3)),indices=[];
 for(let i=0;i<rings-1;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=(i+1)*sides+j,d=(i+1)*sides+(j+1)%sides;indices.push(a,b,c,b,d,c);}
 const capProx=rings*sides,capDist=capProx+1;
 for(let j=0;j<sides;j++){indices.push(capProx,(j+1)%sides,j);indices.push(capDist,(rings-1)*sides+j,(rings-1)*sides+(j+1)%sides);}
 geometry.setIndex(indices);
 const pins={proximal:[...Array.from({length:sides},(_,i)=>i),capProx],distal:[...Array.from({length:sides},(_,i)=>(rings-1)*sides+i),capDist]};
 const positions=[],stations=[];
 for(let i=0;i<rings;i++){const t=i/(rings-1),r=radii(t),c=proximal.clone().lerp(distal,t);for(let j=0;j<sides;j++){const a=2*Math.PI*j/sides;positions.push(c.clone().addScaledVector(u,r.u*Math.cos(a)).addScaledVector(v,r.v*Math.sin(a)));stations.push(t);}}
 positions.push(proximal.clone(),distal.clone());stations.push(0,1);
 const update=(delta,toMesh)=>{
  const tip=distal.clone().applyMatrix4(delta),rotation=new Quaternion();delta.decompose(new Vector3(),rotation,new Vector3());
  const swing=new Quaternion().setFromUnitVectors(direction,tip.clone().sub(proximal).normalize()),projection=rotation.x*direction.x+rotation.y*direction.y+rotation.z*direction.z,twist=new Quaternion(direction.x*projection,direction.y*projection,direction.z*projection,rotation.w).normalize(),a=geometry.attributes.position;
  for(let i=0;i<rings;i++){
   const t=i/(rings-1),r=radii(t),c=proximal.clone().lerp(tip,t),middle=swing.clone().multiply(new Quaternion().slerp(twist,t)),frame=new Quaternion().slerp(middle,smooth(t/.28)).slerp(rotation,smooth((t-.72)/.28)),ru=u.clone().applyQuaternion(frame),rv=v.clone().applyQuaternion(frame);
   for(let j=0;j<sides;j++){const angle=2*Math.PI*j/sides,p=c.clone().addScaledVector(ru,r.u*Math.cos(angle)).addScaledVector(rv,r.v*Math.sin(angle)).applyMatrix4(toMesh);a.setXYZ(i*sides+j,p.x,p.y,p.z);}
  }
  for(const [index,p] of [[capProx,proximal],[capDist,tip]]){const q=p.clone().applyMatrix4(toMesh);a.setXYZ(index,q.x,q.y,q.z);}
  a.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();
 };
 return {geometry,positions,stations,pins,capProx,capDist,body,ends,update};
}
