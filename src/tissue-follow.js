import {Vector3,Quaternion,Matrix4} from 'three';

// Schematic surface-proximity binding, following the existing Hip approach.
// It is a visual follower, not validated footprints, muscle length or strain.
function tree(points,depth=0){if(!points.length)return null;const axis=depth%3;points.sort((a,b)=>a[axis]-b[axis]);const mid=points.length>>1;return {p:points[mid],axis,left:tree(points.slice(0,mid),depth+1),right:tree(points.slice(mid+1),depth+1)};}
function distance2(node,p,best=Infinity){if(!node)return best;const d=p[node.axis]-node.p[node.axis],v=node.p;best=Math.min(best,(p[0]-v[0])**2+(p[1]-v[1])**2+(p[2]-v[2])**2);best=distance2(d<0?node.left:node.right,p,best);if(d*d<best)best=distance2(d<0?node.right:node.left,p,best);return best;}
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
export class TissueFollower{
 constructor(){this.entries=[];this.version=0;this.hip=new Quaternion();this.knee=new Quaternion();this.lastUpdate=-Infinity;}
 clear(){for(const e of this.entries)e.mesh.geometry.dispose();this.entries=[];this.version=0;this.hip.identity();this.knee.identity();this.lastUpdate=-Infinity;}
 prepare({tissues,getMeshes,hipCenter,kneeCenter}){
  this.h=hipCenter.clone();this.k=kneeCenter.clone();const v=new Vector3();
  const samples=name=>{const points=[];for(const mesh of getMeshes(name)){mesh.updateWorldMatrix(true,false);const a=mesh.geometry.attributes.position,step=Math.max(1,Math.floor(a.count/2500));for(let i=0;i<a.count;i+=step){v.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);points.push(v.toArray());}}if(!points.length)throw Error('Missing binding bone '+name);return tree(points);};
  const pelvis=samples('Hip bone.r'),femur=samples('Femur.r'),tibia=samples('Tibia.r');
  for(const [name,,kind,joints] of tissues){if(kind!=='muscle')continue;
   for(const mesh of getMeshes(name)){
    mesh.geometry=mesh.geometry.clone();mesh.updateWorldMatrix(true,false);
    const a=mesh.geometry.attributes.position,source=new Float32Array(a.array),world=new Float64Array(a.count*3),weights=new Float32Array(a.count*2),matrix=mesh.matrixWorld.clone();
    let min=Infinity,max=-Infinity;
    for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(matrix);world.set(v.toArray(),i*3);min=Math.min(min,v.y);max=Math.max(max,v.y);}
    for(let i=0;i<a.count;i++){
     const p=[world[3*i],world[3*i+1],world[3*i+2]],epsilon=1e-10;
     const wp=joints==='knee'?0:1/(distance2(pelvis,p)+epsilon);
     const wf=1/(distance2(femur,p)+epsilon),wt=joints==='hip'?0:1/(distance2(tibia,p)+epsilon),total=wp+wf+wt;
     weights[2*i]=(wf+wt)/total;weights[2*i+1]=wt/total;
     if(name==='Psoas major.r'){weights[2*i]=smooth(((max-p[1])/(max-min)-.34)/(.86-.34));weights[2*i+1]=0;}
    }
    this.entries.push({name,mesh,source,world,weights,inverse:new Matrix4().copy(matrix).invert(),version:-1,maxDisplacement:0});
   }
  }
 }
 update(hip,knee,now=performance.now()){
  const changed=1-Math.abs(this.hip.dot(hip))>1e-12||1-Math.abs(this.knee.dot(knee))>1e-12;
  if(changed){if(now-this.lastUpdate<33)return;this.lastUpdate=now;this.hip.copy(hip);this.knee.copy(knee);this.version++;}
  const identity=new Quaternion(),hQ=new Quaternion(),kQ=new Quaternion(),v=new Vector3(),rest=new Vector3();
  const atRest=hip.angleTo(identity)<1e-5&&knee.angleTo(identity)<1e-5;
  for(const e of this.entries){if(!e.mesh.visible||e.version===this.version)continue;
   const attr=e.mesh.geometry.attributes.position;e.maxDisplacement=0;
   if(atRest)attr.array.set(e.source);
   else for(let i=0;i<attr.count;i++){
    rest.fromArray(e.world,i*3);v.copy(rest);
    kQ.copy(identity).slerp(knee,e.weights[i*2+1]);v.sub(this.k).applyQuaternion(kQ).add(this.k);
    hQ.copy(identity).slerp(hip,e.weights[i*2]);v.sub(this.h).applyQuaternion(hQ).add(this.h);
    e.maxDisplacement=Math.max(e.maxDisplacement,v.distanceTo(rest));v.applyMatrix4(e.inverse);attr.setXYZ(i,v.x,v.y,v.z);
   }
   attr.needsUpdate=true;e.mesh.geometry.computeVertexNormals();e.mesh.geometry.computeBoundingSphere();e.version=this.version;
  }
 }
 snapshot(){return this.entries.map(e=>({name:e.name,vertices:e.source.length/3,visible:e.mesh.visible,maxDisplacement:e.maxDisplacement}));}
}
