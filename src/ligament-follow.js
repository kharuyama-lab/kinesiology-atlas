import {Vector3,Quaternion,Matrix4} from 'three';
import {createCruciateSurface} from './cruciate-surface.js';

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
    if(sourceHash===REVIEWED_CRUCIATE_SOURCE&&name.includes('cruciate')&&(mesh.geometry.index?.count||source.length/3)%3===0){
     const surface=createCruciateSurface(rest,proximal,distalPoint),originalSourceCount=source.length/3,toLocal=mesh.matrixWorld.clone().invert().multiply(femRest);
     surface.update(new Matrix4(),toLocal);mesh.geometry.dispose();mesh.geometry=surface.geometry;
     this.entries.push({name,mesh,femur,distal,source:new Float32Array(mesh.geometry.attributes.position.array),rest:surface.positions,weights:new Float32Array(surface.stations),centers:surface.stations.map(t=>proximal.clone().lerp(distalPoint,t)),pinned:surface.pins,proximal,distalPoint,surface,originalSourceCount,courseCorrected:true,maxRestCorrection:0,femRest,distalRestInverse:distal.matrixWorld.clone().invert(),restSpan:Math.sqrt(length2),span:Math.sqrt(length2)});
     continue;
    }
    const pinned={proximal:[],distal:[]};weights.forEach((w,i)=>{if(w===0)pinned.proximal.push(i);if(w===1)pinned.distal.push(i);});
    if(!pinned.proximal.length||!pinned.distal.length)throw Error('Missing ligament attachment collar: '+name);
    const courseCorrected=false,maxRestCorrection=0;
    this.entries.push({name,mesh,femur,distal,source,rest,weights,centers,pinned,proximal,distalPoint,maxRestCorrection,courseCorrected,
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
   if(e.surface){e.surface.update(delta,toMesh);continue;}
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
   a.needsUpdate=true;e.mesh.geometry.computeVertexNormals();
   e.mesh.geometry.computeBoundingSphere();e.mesh.geometry.computeBoundingBox();
  }
 }
 snapshot(){return this.entries.map(e=>({name:e.name,distalBone:kneeLigamentBones[e.name],vertices:e.rest.length,sourceVertices:e.originalSourceCount||e.rest.length,representation:e.surface?'smooth-source-fitted':'source-mesh',attachmentCentres:e.surface?{proximalIndex:e.surface.capProx,distalIndex:e.surface.capDist}:null,
  proximalVertices:e.pinned.proximal.length,distalVertices:e.pinned.distal.length,restSpan:e.restSpan,span:e.span,
  spanRatio:e.span/e.restSpan,maxRestCorrection:e.maxRestCorrection,courseCorrected:e.courseCorrected,status:e.surface?'Source-centred smooth presentation surface; not validated force or strain':'Original mesh follower; not validated force or strain'}));}
}
