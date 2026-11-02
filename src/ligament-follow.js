import {Vector3,Quaternion,Matrix4} from 'three';
import {ligamentPath} from './ligament-path.js';

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
    const rest=points.map(p=>p.applyMatrix4(femInverse)),weights=new Float32Array(rest.length),centers=[],stations=[];
    for(let i=0;i<rest.length;i++){
     const t=Math.max(0,Math.min(1,rest[i].clone().sub(proximal).dot(axis)/length2));
     stations.push(t);weights[i]=smooth((t-.15)/.7);centers.push(proximal.clone().addScaledVector(axis,t));
    }
    const pinned={proximal:[],distal:[]};weights.forEach((w,i)=>{if(w===0)pinned.proximal.push(i);if(w===1)pinned.distal.push(i);});
    if(!pinned.proximal.length||!pinned.distal.length)throw Error('Missing ligament attachment collar: '+name);
    // MCL representative proximal/posterior attachment, within its original
    // footprint. Do not fit the bone trajectory to a desired tension effect.
    const sourceProximal=proximal.clone();
    if(name.includes('tibial collateral')){
     const candidates=pinned.proximal.map(i=>rest[i]),ys=candidates.map(p=>p.y),zs=candidates.map(p=>p.z),loY=Math.min(...ys),hiY=Math.max(...ys),loZ=Math.min(...zs),hiZ=Math.max(...zs);
     const score=p=>(p.y-loY)/(hiY-loY||1)-(p.z-loZ)/(hiZ-loZ||1);
     const anchor=candidates.reduce((best,p)=>score(p)>score(best)?p:best,candidates[0]).clone(),shift=anchor.clone().sub(proximal);
     for(let i=0;i<rest.length;i++)rest[i].addScaledVector(shift,1-weights[i]);
     proximal.copy(anchor);axis.copy(distalPoint).sub(proximal);
    }
    const direction=axis.clone().normalize();
    const sectionRadials=rest.map((p,i)=>{const neighbors=rest.filter((_,j)=>Math.abs(stations[j]-stations[i])<.08),center=neighbors.reduce((v,p)=>v.add(p),new Vector3()).multiplyScalar(1/neighbors.length),radial=p.clone().sub(center);return radial.addScaledVector(direction,-radial.dot(direction));});
    this.entries.push({name,mesh,femur,distal,source,rest,weights,centers,stations,sectionRadials,pinned,proximal,sourceProximal,distalPoint,
     femRest,distalRestInverse:distal.matrixWorld.clone().invert(),restSpan:axis.length(),span:axis.length()});
   }
  }
 }
 update({active=false}={}){
  const p=new Vector3(),target=new Vector3(),rotation=new Quaternion(),q=new Quaternion(),scale=new Vector3();
  for(const e of this.entries){
   e.femur.updateWorldMatrix(true,false);e.distal.updateWorldMatrix(true,false);e.mesh.updateWorldMatrix(true,false);
   const delta=new Matrix4().copy(e.femur.matrixWorld).invert().multiply(e.distal.matrixWorld).multiply(e.distalRestInverse).multiply(e.femRest);
   delta.decompose(new Vector3(),rotation,scale);
   const toMesh=new Matrix4().copy(e.mesh.matrixWorld).invert().multiply(e.femur.matrixWorld),a=e.mesh.geometry.attributes.position;
   e.span=e.proximal.distanceTo(e.distalPoint.clone().applyMatrix4(delta));
   const distalNow=e.distalPoint.clone().applyMatrix4(delta),straightRotation=new Quaternion().setFromUnitVectors(e.distalPoint.clone().sub(e.proximal).normalize(),distalNow.clone().sub(e.proximal).normalize());
   // A shortened chord consumes the same material length as a curved route.
   // Never shrink material length merely because a teaching score is high.
   const outward=new Vector3(e.name.includes('tibial collateral')?1:e.name.startsWith('Fibular')?-1:0,0,e.name.includes('cruciate')?-1:0);
   const path=ligamentPath(e.proximal,distalNow,e.restSpan,outward);
   e.routeLength=path.length;e.slack=path.amplitude;e.takeUp=path.amplitude<1e-6?1:0;
   for(let i=0;i<e.rest.length;i++){
    const w=e.weights[i],rest=e.rest[i];
    if(w===0)p.copy(rest);else if(w===1)p.copy(rest).applyMatrix4(delta);
    else{
     // Transport each cross section between the two rigid bone frames.
     // Preserve section width rather than linearly crushing rotated vertices.
     const c=e.centers[i];target.copy(c).lerp(p.copy(c).applyMatrix4(delta),w);
     q.identity().slerp(rotation,w);p.copy(rest).sub(c).applyQuaternion(q).add(target);
     if(active)p.copy(path.point(e.stations[i])).add(e.sectionRadials[i].clone().applyQuaternion(straightRotation));
    }
    p.applyMatrix4(toMesh);a.setXYZ(i,p.x,p.y,p.z);
   }
   a.needsUpdate=true;e.mesh.geometry.computeVertexNormals();e.mesh.geometry.computeBoundingSphere();
  }
 }
 snapshot(){return this.entries.map(e=>({name:e.name,distalBone:kneeLigamentBones[e.name],vertices:e.rest.length,
  proximalVertices:e.pinned.proximal.length,distalVertices:e.pinned.distal.length,restSpan:e.restSpan,span:e.span,
  spanRatio:e.span/e.restSpan,routeLength:e.routeLength,referenceLength:e.restSpan,slack:e.slack,attachmentShift:e.proximal.distanceTo(e.sourceProximal),takeUp:e.takeUp||0,status:'Provisional footprint and constant-length route; not validated force or strain'}));}
}
