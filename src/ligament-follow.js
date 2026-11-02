import {Vector3,Quaternion,Matrix4} from 'three';

export const REVIEWED_CRUCIATE_SOURCE='9fdab1a257652597cf8f0b2ac93d12abc817e8f9a9099b9628e764018490afa2';
export const kneeLigamentBones=Object.freeze({
 'Anterior cruciate ligament.r':'Tibia.r',
 'Posterior cruciate ligament.r':'Tibia.r',
 'Superficial part of tibial collateral ligament.r':'Tibia.r',
 'Deep part of tibial collateral ligament.r':'Tibia.r',
 'Fibular collateral ligament.r':'Fibula.r'
});
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};

// Footprint collars come from the source mesh's proximal/distal end regions.
// These are provisional anatomical bindings, not ligament force/strain models.
export class LigamentFollower{
 constructor(){this.entries=[];}
 clear(){for(const e of this.entries)e.mesh.geometry.dispose();this.entries=[];}
 prepare({getMeshes,bones,sourceHash=null}){
  this.entries=[];const femur=bones.femur;femur.updateWorldMatrix(true,true);
  const femRest=femur.matrixWorld.clone(),femInverse=femRest.clone().invert();
  for(const [name,distalName] of Object.entries(kneeLigamentBones)){
   const distal=bones[distalName];if(!distal)continue;distal.updateWorldMatrix(true,true);
   for(const mesh of getMeshes(name)){
    mesh.updateWorldMatrix(true,false);mesh.geometry=mesh.geometry.clone();
    const source=new Float32Array(mesh.geometry.attributes.position.array),points=[];
    for(let i=0;i<source.length/3;i++)points.push(new Vector3().fromArray(source,i*3).applyMatrix4(mesh.matrixWorld));
    const min=Math.min(...points.map(p=>p.y)),max=Math.max(...points.map(p=>p.y)),height=max-min;
    if(height<1e-9)throw Error('Degenerate ligament end regions: '+name);
    const center=upper=>{const region=points.filter(p=>upper?p.y>=max-height*.12:p.y<=min+height*.12);return region.reduce((v,p)=>v.add(p),new Vector3()).multiplyScalar(1/region.length).applyMatrix4(femInverse);};
    const proximal=center(true),distalPoint=center(false),axis=distalPoint.clone().sub(proximal),length2=axis.lengthSq();
    const rest=points.map(p=>p.applyMatrix4(femInverse)),weights=new Float32Array(rest.length),centers=[];
    for(let i=0;i<rest.length;i++){
     const t=Math.max(0,Math.min(1,rest[i].clone().sub(proximal).dot(axis)/length2));
     weights[i]=smooth((t-.15)/.7);centers.push(proximal.clone().addScaledVector(axis,t));
    }
    const pinned={proximal:[],distal:[]};weights.forEach((w,i)=>{if(w===0)pinned.proximal.push(i);if(w===1)pinned.distal.push(i);});
    if(!pinned.proximal.length||!pinned.distal.length)throw Error('Missing ligament attachment collar: '+name);
    const courseCorrected=sourceHash===REVIEWED_CRUCIATE_SOURCE&&name.includes('cruciate');let maxRestCorrection=0;
    if(courseCorrected){
     // The supplied cruciate body has an anterior bulge even in its rest mesh.
     // Recenter sections on their attachment-to-attachment course, keeping
     // each section's width and both original attachment collars unchanged.
     const original=rest.map(p=>p.clone()),direction=axis.clone().normalize();
     const stations=centers.map(c=>c.clone().sub(proximal).dot(axis)/length2);
     const unique=new Map();original.forEach((p,i)=>{const key=p.toArray().map(v=>v.toFixed(7)).join(',');if(!unique.has(key))unique.set(key,{t:stations[i],radial:p.clone().sub(centers[i])});});
     for(let i=0;i<rest.length;i++){
      if(weights[i]===0||weights[i]===1)continue;
      const t=stations[i],offset=new Vector3();let sum=0;
      for(const sample of unique.values()){const g=Math.exp(-.5*((sample.t-t)/.075)**2);offset.addScaledVector(sample.radial,g);sum+=g;}
      offset.multiplyScalar(1/sum);offset.addScaledVector(direction,-offset.dot(direction));
      const blend=smooth((t-.15)/.20)*smooth((.85-t)/.20);
      offset.multiplyScalar(blend);rest[i].sub(offset);maxRestCorrection=Math.max(maxRestCorrection,offset.length());
     }
    }
    const normalGroups=new Map(),sourceNormals=mesh.geometry.attributes.normal;
    if(courseCorrected)for(let i=0;i<source.length/3;i++){const key=Array.from(source.slice(i*3,i*3+3)).map(v=>v.toFixed(7)).join(',')+'/'+(sourceNormals?Array.from(sourceNormals.array.slice(i*3,i*3+3)).map(v=>v.toFixed(4)).join(','):'');if(!normalGroups.has(key))normalGroups.set(key,[]);normalGroups.get(key).push(i);}
    this.entries.push({normalGroups,name,mesh,femur,distal,source,rest,weights,centers,pinned,proximal,distalPoint,maxRestCorrection,courseCorrected,
     femRest,distalRestInverse:distal.matrixWorld.clone().invert(),restSpan:Math.sqrt(length2),span:Math.sqrt(length2)});
   }
  }
 }
 update(){
  const p=new Vector3(),target=new Vector3(),rotation=new Quaternion(),q=new Quaternion(),scale=new Vector3();
  for(const e of this.entries){
   e.femur.updateWorldMatrix(true,false);e.distal.updateWorldMatrix(true,false);e.mesh.updateWorldMatrix(true,false);
   const delta=new Matrix4().copy(e.femur.matrixWorld).invert().multiply(e.distal.matrixWorld).multiply(e.distalRestInverse).multiply(e.femRest);
   delta.decompose(new Vector3(),rotation,scale);
   const toMesh=new Matrix4().copy(e.mesh.matrixWorld).invert().multiply(e.femur.matrixWorld),a=e.mesh.geometry.attributes.position;
   e.span=e.proximal.distanceTo(e.distalPoint.clone().applyMatrix4(delta));
   const distalNow=e.distalPoint.clone().applyMatrix4(delta),axis=e.distalPoint.clone().sub(e.proximal),length2=axis.lengthSq();
   for(let i=0;i<e.rest.length;i++){
    const w=e.weights[i],rest=e.rest[i];
    if(w===0)p.copy(rest);else if(w===1)p.copy(rest).applyMatrix4(delta);
    else{
     // Transport each cross section between the two rigid bone frames.
     // Preserve section width rather than linearly crushing rotated vertices.
     const c=e.centers[i];target.copy(c).lerp(p.copy(c).applyMatrix4(delta),w);
     if(e.courseCorrected){
      const t=c.clone().sub(e.proximal).dot(axis)/length2,blend=smooth((t-.15)/.20)*smooth((.85-t)/.20);
      target.lerp(e.proximal.clone().lerp(distalNow,t),blend);
     }
     q.identity().slerp(rotation,w);p.copy(rest).sub(c).applyQuaternion(q).add(target);
    }
    p.applyMatrix4(toMesh);a.setXYZ(i,p.x,p.y,p.z);
   }
   a.needsUpdate=true;e.mesh.geometry.computeVertexNormals();
   const normals=e.mesh.geometry.attributes.normal;for(const group of e.normalGroups.values()){if(group.length<2)continue;const n=group.reduce((v,i)=>v.add(new Vector3().fromBufferAttribute(normals,i)),new Vector3()).normalize();for(const i of group)normals.setXYZ(i,n.x,n.y,n.z);}if(e.normalGroups.size)normals.needsUpdate=true;
   e.mesh.geometry.computeBoundingSphere();
  }
 }
 snapshot(){return this.entries.map(e=>({name:e.name,distalBone:kneeLigamentBones[e.name],vertices:e.rest.length,
  proximalVertices:e.pinned.proximal.length,distalVertices:e.pinned.distal.length,restSpan:e.restSpan,span:e.span,
  spanRatio:e.span/e.restSpan,maxRestCorrection:e.maxRestCorrection,courseCorrected:e.courseCorrected,status:'Original attachment collars; cruciate body-course correction; not validated force or strain'}));}
}
