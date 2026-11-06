import {Vector3,Quaternion,Matrix4,Triangle} from 'three';
import {ankleLigaments,ankleAttachmentSurfaces} from '../config/ankle-ligaments.js';
const smooth=t=>{const x=Math.min(1,Math.max(0,t));return x*x*(3-2*x);};
const closest=(point,surfaces)=>{let best=null,distance2=Infinity;const p=new Vector3();for(const s of surfaces){s.triangle.closestPointToPoint(point,p);const d=point.distanceToSquared(p);if(d<distance2){distance2=d;best={point:p.clone(),bone:s.bone,triangle:s.localTriangle};}}return {...best,distance:Math.sqrt(distance2)};};

// Fit collars once to actual bone triangles, then keep the material footprint
// fixed in its owning bone coordinates. No nearest-point sliding during poses.
export class AnkleLigamentFollower{
 constructor(){this.entries=[];this.missing=[];}
 clear(){for(const e of this.entries)e.mesh.geometry.dispose();this.entries=[];this.missing=[];}
 prepare({getMeshes,registered}){
  this.entries=[];this.missing=[];const surfaceCache=new Map();
  const surface=name=>{if(!surfaceCache.has(name)){const triangles=[],bone=registered.get(name);bone.updateWorldMatrix(true,false);const inverse=bone.matrixWorld.clone().invert();for(const mesh of getMeshes(name)){mesh.updateWorldMatrix(true,false);const a=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?index.count:a.count;for(let i=0;i+2<count;i+=3){const p=[0,1,2].map(k=>new Vector3().fromBufferAttribute(a,index?index.getX(i+k):i+k).applyMatrix4(mesh.matrixWorld));if(new Vector3().crossVectors(p[1].clone().sub(p[0]),p[2].clone().sub(p[0])).lengthSq()<1e-24)continue;triangles.push({bone,triangle:new Triangle(...p),localTriangle:new Triangle(...p.map(v=>v.clone().applyMatrix4(inverse)))});}}surfaceCache.set(name,triangles);}return surfaceCache.get(name);};
  for(const [name,,aName,bName] of ankleLigaments){const aBone=registered.get(aName),bBone=registered.get(bName),meshes=getMeshes(name);if(!aBone||!bBone||!meshes.length){this.missing.push(name);continue;}aBone.updateWorldMatrix(true,false);bBone.updateWorldMatrix(true,false);
   const surfaces=ankleAttachmentSurfaces[name]||{a:[aName],b:[bName]},surfacesA=surfaces.a.flatMap(surface),surfacesB=surfaces.b.flatMap(surface);if(!surfacesA.length||!surfacesB.length)throw Error('Missing attachment bone triangles: '+name);
   for(const mesh of meshes){mesh.updateWorldMatrix(true,false);mesh.geometry=mesh.geometry.clone();const attribute=mesh.geometry.attributes.position,source=[];
    for(let i=0;i<attribute.count;i++)source.push(new Vector3().fromBufferAttribute(attribute,i).applyMatrix4(mesh.matrixWorld));
    const fits=source.map(p=>({a:closest(p,surfacesA),b:closest(p,surfacesB)})),scores=fits.map((fit,i)=>({i,da:fit.a.distance,db:fit.b.distance})).sort((a,b)=>(a.da-a.db)-(b.da-b.db));
    const collarCount=Math.max(3,Math.ceil(source.length*.12)),aCollar=scores.slice(0,collarCount),bCollar=scores.slice(-collarCount),centroid=(points,collar)=>collar.reduce((v,p)=>v.add(points[p.i]),new Vector3()).multiplyScalar(1/collar.length),sourceA=centroid(source,aCollar),sourceB=centroid(source,bCollar),axis=sourceB.clone().sub(sourceA),length2=axis.lengthSq();
    if(length2<1e-10)throw Error('Degenerate attachment collars: '+name);
    const aPins=new Set(aCollar.map(p=>p.i)),bPins=new Set(bCollar.map(p=>p.i)),weights=source.map((p,i)=>{const t=Math.max(0,Math.min(1,p.clone().sub(sourceA).dot(axis)/length2));return aPins.has(i)?0:bPins.has(i)?1:smooth((t-.12)/.76);}),anchors=new Map();
    // Spread fitted endpoint displacements through the source topology rather
    // than bending each interior vertex independently toward a nearby bone.
    const neighbors=source.map(()=>new Set()),index=mesh.geometry.index,count=index?index.count:source.length;
    for(let j=0;j+2<count;j+=3){const ids=[0,1,2].map(k=>index?index.getX(j+k):j+k);for(const u of ids)for(const v of ids)if(u!==v)neighbors[u].add(v);}
    // Weld coincident source vertices for smoothing across material/UV seams.
    const coincident=new Map();source.forEach((p,i)=>{const key=p.toArray().map(v=>Math.round(v*1e7)).join(',');if(!coincident.has(key))coincident.set(key,[]);coincident.get(key).push(i);});for(const ids of coincident.values())for(const u of ids)for(const v of ids)if(u!==v)neighbors[u].add(v);
    let corrections=source.map((p,i)=>{const w=weights[i];if(w!==0&&w!==1)return new Vector3();const fit=w===0?fits[i].a:fits[i].b;anchors.set(i,{bone:fit.bone,local:fit.point.clone().applyMatrix4(fit.bone.matrixWorld.clone().invert()),triangle:fit.triangle});return fit.point.clone().sub(p);});
    for(let iteration=0;iteration<60;iteration++)corrections=corrections.map((d,i)=>{if(anchors.has(i)||!neighbors[i].size)return d;const mean=new Vector3();for(const j of neighbors[i])mean.add(corrections[j]);return d.clone().lerp(mean.multiplyScalar(1/neighbors[i].size),.65);});
    const rest=source.map((p,i)=>p.clone().add(corrections[i]));
    const a=centroid(rest,aCollar),b=centroid(rest,bCollar),restAxis=b.clone().sub(a),restLength2=restAxis.lengthSq(),stations=rest.map(p=>a.clone().addScaledVector(restAxis,Math.max(0,Math.min(1,p.clone().sub(a).dot(restAxis)/restLength2))));
    const inverse=mesh.matrixWorld.clone().invert(),restLocal=new Float32Array(attribute.array.length);for(let i=0;i<rest.length;i++){const p=rest[i].clone().applyMatrix4(inverse);restLocal.set(p.toArray(),i*3);}
    this.entries.push({name,mesh,aBone,bBone,aName,bName,rest,stations,weights,anchors,a,b,aInverse:aBone.matrixWorld.clone().invert(),bInverse:bBone.matrixWorld.clone().invert(),restSpan:Math.sqrt(restLength2),span:Math.sqrt(restLength2),aCollar:[...aPins],bCollar:[...bPins],aGap:aCollar.reduce((s,p)=>s+p.da,0)/aCollar.length,bGap:bCollar.reduce((s,p)=>s+p.db,0)/bCollar.length,restLocal,maxSourceCorrection:Math.max(...rest.map((p,i)=>p.distanceTo(source[i])))});
   }
  }
 }
 update(){const p=new Vector3(),target=new Vector3(),qa=new Quaternion(),qb=new Quaternion(),q=new Quaternion(),dummy=new Vector3(),scale=new Vector3();
  for(const e of this.entries){e.aBone.updateWorldMatrix(true,false);e.bBone.updateWorldMatrix(true,false);e.mesh.updateWorldMatrix(true,false);const da=new Matrix4().multiplyMatrices(e.aBone.matrixWorld,e.aInverse),db=new Matrix4().multiplyMatrices(e.bBone.matrixWorld,e.bInverse),inverse=e.mesh.matrixWorld.clone().invert(),attribute=e.mesh.geometry.attributes.position;
   da.decompose(dummy,qa,scale);db.decompose(dummy,qb,scale);e.span=e.a.clone().applyMatrix4(da).distanceTo(e.b.clone().applyMatrix4(db));
   for(let i=0;i<e.rest.length;i++){const w=e.weights[i],source=e.rest[i],center=e.stations[i],anchor=e.anchors.get(i);if(anchor){anchor.bone.updateWorldMatrix(true,false);p.copy(anchor.local).applyMatrix4(anchor.bone.matrixWorld);}else{target.copy(center).applyMatrix4(da).lerp(p.copy(center).applyMatrix4(db),w);q.copy(qa).slerp(qb,w);p.copy(source).sub(center).applyQuaternion(q).add(target);}p.applyMatrix4(inverse);attribute.setXYZ(i,p.x,p.y,p.z);}
   attribute.needsUpdate=true;e.mesh.geometry.computeVertexNormals();e.mesh.geometry.computeBoundingSphere();e.mesh.geometry.computeBoundingBox();
  }
 }
 snapshot(){return this.entries.map(e=>({name:e.name,bones:[e.aName,e.bName],vertices:e.rest.length,collarVertices:[e.aCollar.length,e.bCollar.length],sourceGaps:[e.aGap,e.bGap],maxSourceCorrection:e.maxSourceCorrection,restSpan:e.restSpan,span:e.span,spanRatio:e.span/e.restSpan,status:'bone-triangle fitted collars; span ratio is not strain or force'}));}
 audit(){return this.entries.map(e=>{const attribute=e.mesh.geometry.attributes.position;let maxAnchorError=0,maxSurfaceGap=0,maxRestError=0,finite=true;const byBone={};for(let i=0;i<attribute.count;i++){const anchor=e.anchors.get(i);if(anchor){const actual=new Vector3().fromBufferAttribute(attribute,i).applyMatrix4(e.mesh.matrixWorld),expected=anchor.local.clone().applyMatrix4(anchor.bone.matrixWorld),local=actual.clone().applyMatrix4(anchor.bone.matrixWorld.clone().invert()),nearest=anchor.triangle.closestPointToPoint(local,new Vector3()),gap=local.distanceTo(nearest);maxAnchorError=Math.max(maxAnchorError,actual.distanceTo(expected));maxSurfaceGap=Math.max(maxSurfaceGap,gap);const key=anchor.bone.userData?.za_name||anchor.bone.uuid;byBone[key]=Math.max(byBone[key]||0,gap);}for(let k=0;k<3;k++){const value=attribute.array[i*3+k];finite=finite&&Number.isFinite(value);maxRestError=Math.max(maxRestError,Math.abs(value-e.restLocal[i*3+k]));}}return {name:e.name,maxAnchorError,maxSurfaceGap,byBone,maxRestError,finite};});}
}
