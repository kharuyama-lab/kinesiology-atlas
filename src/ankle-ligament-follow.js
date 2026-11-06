import {Vector3,Quaternion,Matrix4} from 'three';
import {ankleLigaments,ankleAttachmentSurfaces} from '../config/ankle-ligaments.js';
const smooth=t=>{const x=Math.min(1,Math.max(0,t));return x*x*(3-2*x);};
const nearest=(p,points)=>Math.sqrt(points.reduce((d,q)=>Math.min(d,p.distanceToSquared(q)),Infinity));

// Preserve original mesh surfaces and collar points; no procedural replacement
// ligaments, forces, or changes to the locked skeletal motion are introduced.
export class AnkleLigamentFollower{
 constructor(){this.entries=[];this.missing=[];}
 clear(){for(const e of this.entries)e.mesh.geometry.dispose();this.entries=[];this.missing=[];}
 prepare({getMeshes,registered}){
  this.entries=[];this.missing=[];const bonePoints=new Map();
  const surface=name=>{if(!bonePoints.has(name)){const p=[];for(const mesh of getMeshes(name)){mesh.updateWorldMatrix(true,false);const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++)p.push(new Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld));}bonePoints.set(name,p);}return bonePoints.get(name);};
  for(const [name,,aName,bName] of ankleLigaments){const aBone=registered.get(aName),bBone=registered.get(bName),meshes=getMeshes(name);if(!aBone||!bBone||!meshes.length){this.missing.push(name);continue;}aBone.updateWorldMatrix(true,false);bBone.updateWorldMatrix(true,false);
   const surfaces=ankleAttachmentSurfaces[name]||{a:[aName],b:[bName]},pointsA=surfaces.a.flatMap(surface),pointsB=surfaces.b.flatMap(surface);if(!pointsA.length||!pointsB.length)throw Error('Missing attachment bone surfaces: '+name);
   for(const mesh of meshes){mesh.updateWorldMatrix(true,false);const sourceGeometry=mesh.geometry;mesh.geometry=sourceGeometry.clone();const attribute=mesh.geometry.attributes.position,rest=[];
    for(let i=0;i<attribute.count;i++)rest.push(new Vector3().fromBufferAttribute(attribute,i).applyMatrix4(mesh.matrixWorld));
    const scores=rest.map((p,i)=>({i,da:nearest(p,pointsA),db:nearest(p,pointsB)})).sort((a,b)=>(a.da-a.db)-(b.da-b.db));
    const collarCount=Math.max(3,Math.ceil(rest.length*.12)),aCollar=scores.slice(0,collarCount),bCollar=scores.slice(-collarCount),centroid=collar=>collar.reduce((v,p)=>v.add(rest[p.i]),new Vector3()).multiplyScalar(1/collar.length),a=centroid(aCollar),b=centroid(bCollar),axis=b.clone().sub(a),length2=axis.lengthSq();
    if(length2<1e-10)throw Error('Degenerate source attachment collars: '+name);
    const aPins=new Set(aCollar.map(p=>p.i)),bPins=new Set(bCollar.map(p=>p.i)),stations=[],weights=[];
    for(let i=0;i<rest.length;i++){const t=Math.max(0,Math.min(1,rest[i].clone().sub(a).dot(axis)/length2));stations.push(a.clone().addScaledVector(axis,t));weights.push(aPins.has(i)?0:bPins.has(i)?1:smooth((t-.12)/.76));}
    this.entries.push({name,mesh,aBone,bBone,aName,bName,rest,stations,weights,a,b,aInverse:aBone.matrixWorld.clone().invert(),bInverse:bBone.matrixWorld.clone().invert(),restSpan:Math.sqrt(length2),span:Math.sqrt(length2),aCollar:[...aPins],bCollar:[...bPins],aGap:aCollar.reduce((s,p)=>s+p.da,0)/aCollar.length,bGap:bCollar.reduce((s,p)=>s+p.db,0)/bCollar.length,maxAnchorError:0,restLocal:new Float32Array(attribute.array)});
   }
  }
 }
 update(){const p=new Vector3(),target=new Vector3(),qa=new Quaternion(),qb=new Quaternion(),q=new Quaternion(),dummy=new Vector3(),scale=new Vector3();
  for(const e of this.entries){e.aBone.updateWorldMatrix(true,false);e.bBone.updateWorldMatrix(true,false);e.mesh.updateWorldMatrix(true,false);const da=new Matrix4().multiplyMatrices(e.aBone.matrixWorld,e.aInverse),db=new Matrix4().multiplyMatrices(e.bBone.matrixWorld,e.bInverse),inverse=e.mesh.matrixWorld.clone().invert(),attribute=e.mesh.geometry.attributes.position;
   da.decompose(dummy,qa,scale);db.decompose(dummy,qb,scale);e.span=e.a.clone().applyMatrix4(da).distanceTo(e.b.clone().applyMatrix4(db));e.maxAnchorError=0;
   for(let i=0;i<e.rest.length;i++){const w=e.weights[i],source=e.rest[i],center=e.stations[i];if(w===0)p.copy(source).applyMatrix4(da);else if(w===1)p.copy(source).applyMatrix4(db);else{target.copy(center).applyMatrix4(da).lerp(p.copy(center).applyMatrix4(db),w);q.copy(qa).slerp(qb,w);p.copy(source).sub(center).applyQuaternion(q).add(target);}p.applyMatrix4(inverse);attribute.setXYZ(i,p.x,p.y,p.z);}
   attribute.needsUpdate=true;e.mesh.geometry.computeVertexNormals();e.mesh.geometry.computeBoundingSphere();e.mesh.geometry.computeBoundingBox();
  }
 }
 snapshot(){return this.entries.map(e=>({name:e.name,bones:[e.aName,e.bName],vertices:e.rest.length,collarVertices:[e.aCollar.length,e.bCollar.length],sourceGaps:[e.aGap,e.bGap],restSpan:e.restSpan,span:e.span,spanRatio:e.span/e.restSpan,status:'original mesh; estimated source collars; span ratio is not strain or force'}));}
 audit(){return this.entries.map(e=>{const attribute=e.mesh.geometry.attributes.position,da=new Matrix4().multiplyMatrices(e.aBone.matrixWorld,e.aInverse),db=new Matrix4().multiplyMatrices(e.bBone.matrixWorld,e.bInverse);let maxAnchorError=0,maxRestError=0,finite=true;for(let i=0;i<attribute.count;i++){const actual=new Vector3().fromBufferAttribute(attribute,i).applyMatrix4(e.mesh.matrixWorld),w=e.weights[i];if(w===0||w===1)maxAnchorError=Math.max(maxAnchorError,actual.distanceTo(e.rest[i].clone().applyMatrix4(w===0?da:db)));for(let k=0;k<3;k++){const value=attribute.array[i*3+k];finite=finite&&Number.isFinite(value);maxRestError=Math.max(maxRestError,Math.abs(value-e.restLocal[i*3+k]));}}return {name:e.name,maxAnchorError,maxRestError,finite};});}
}
