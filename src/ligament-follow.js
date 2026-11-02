import {Vector3,Quaternion,Matrix4} from 'three';

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
 prepare({getMeshes,bones}){
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
    this.entries.push({name,mesh,femur,distal,source,rest,weights,centers,pinned,proximal,distalPoint,
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
   for(let i=0;i<e.rest.length;i++){
    const w=e.weights[i],rest=e.rest[i];
    if(w===0)p.copy(rest);else if(w===1)p.copy(rest).applyMatrix4(delta);
    else{
     // Transport each cross section between the two rigid bone frames.
     // Preserve section width rather than linearly crushing rotated vertices.
     const c=e.centers[i];target.copy(c).lerp(p.copy(c).applyMatrix4(delta),w);
     q.identity().slerp(rotation,w);p.copy(rest).sub(c).applyQuaternion(q).add(target);
    }
    p.applyMatrix4(toMesh);a.setXYZ(i,p.x,p.y,p.z);
   }
   a.needsUpdate=true;e.mesh.geometry.computeVertexNormals();e.mesh.geometry.computeBoundingSphere();
  }
 }
 snapshot(){return this.entries.map(e=>({name:e.name,distalBone:kneeLigamentBones[e.name],vertices:e.rest.length,
  proximalVertices:e.pinned.proximal.length,distalVertices:e.pinned.distal.length,restSpan:e.restSpan,span:e.span,
  spanRatio:e.span/e.restSpan,status:'Mesh-end binding; span ratio is not strain or force'}));}
}
