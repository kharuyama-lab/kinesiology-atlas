import {MuscleCurve,usesMuscleCurve} from './muscle-curve.js';
import {Vector3,Quaternion,Matrix4} from 'three';

// Schematic surface-proximity binding, following the existing Hip approach.
// It is a visual follower, not validated footprints, muscle length or strain.
function tree(points,depth=0){if(!points.length)return null;const axis=depth%3;points.sort((a,b)=>a[axis]-b[axis]);const mid=points.length>>1;return {p:points[mid],axis,left:tree(points.slice(0,mid),depth+1),right:tree(points.slice(mid+1),depth+1)};}
function distance2(node,p,best=Infinity){if(!node)return best;const d=p[node.axis]-node.p[node.axis],v=node.p;best=Math.min(best,(p[0]-v[0])**2+(p[1]-v[1])**2+(p[2]-v[2])**2);best=distance2(d<0?node.left:node.right,p,best);if(d*d<best)best=distance2(d<0?node.right:node.left,p,best);return best;}
const clamp=x=>Math.max(0,Math.min(1,x));
function closest(node,p,best={p:null,d2:Infinity}){if(!node)return best;const d2=p.reduce((s,v,i)=>s+(v-node.p[i])**2,0);if(d2<best.d2)best={p:node.p,d2};const delta=p[node.axis]-node.p[node.axis];best=closest(delta<0?node.left:node.right,p,best);if(delta*delta<best.d2)best=closest(delta<0?node.right:node.left,p,best);return best;}
function smoothWeights(g,weights){const idx=g.index;if(!idx)return weights;let w=weights;for(let pass=0;pass<2;pass++){const sums=new Float32Array(w.length),counts=new Uint32Array(w.length);for(let k=0;k<idx.count;k+=3){const a=idx.getX(k),b=idx.getX(k+1),c=idx.getX(k+2);for(const [i,j,l] of [[a,b,c],[b,a,c],[c,a,b]]){sums[i]+=w[j]+w[l];counts[i]+=2;}}w=Float32Array.from(w,(v,i)=>counts[i]?.65*v+.35*sums[i]/counts[i]:v);}return w;}
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
export class TissueFollower{
 constructor(){this.entries=[];this.version=0;this.hip=new Quaternion();this.knee=new Quaternion();this.lastUpdate=-Infinity;this.translation=new Vector3();this.patellaRotation=new Quaternion();this.patellaTranslation=new Vector3();}
 clear(){for(const e of this.entries)e.mesh.geometry.dispose();this.entries=[];this.version=0;this.hip.identity();this.knee.identity();this.translation.set(0,0,0);this.patellaRotation.identity();this.patellaTranslation.set(0,0,0);this.lastUpdate=-Infinity;}
 prepare({tissues,getMeshes,hipCenter,kneeCenter}){
  this.h=hipCenter.clone();this.k=kneeCenter.clone();const v=new Vector3();
  const samples=name=>{const points=[];for(const mesh of getMeshes(name)){mesh.updateWorldMatrix(true,false);const a=mesh.geometry.attributes.position,step=Math.max(1,Math.floor(a.count/2500));for(let i=0;i<a.count;i+=step){v.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);points.push(v.toArray());}}if(!points.length)throw Error('Missing binding bone '+name);return tree(points);};
  const pelvis=samples('Hip bone.r'),femur=samples('Femur.r');
  for(const [name,,kind,joints] of tissues){if(kind!=='muscle'&&!(kind==='ligament'&&joints==='hip'))continue;
   for(const mesh of getMeshes(name)){
    mesh.geometry=mesh.geometry.clone();mesh.updateWorldMatrix(true,false);
    const a=mesh.geometry.attributes.position,source=new Float32Array(a.array),world=new Float64Array(a.count*3),weights=new Float32Array(a.count*2),matrix=mesh.matrixWorld.clone();
    let min=Infinity,max=-Infinity;
    for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(matrix);world.set(v.toArray(),i*3);min=Math.min(min,v.y);max=Math.max(max,v.y);}
    for(let i=0;i<a.count;i++){
     const p=[world[3*i],world[3*i+1],world[3*i+2]];
     const dp=Math.sqrt(distance2(pelvis,p)),df=Math.sqrt(distance2(femur,p));
     // Exact legacy Hip proximity field; do not distribute hip rotation along
     // the entire length of a biarticular muscle (which makes a large arc).
     weights[2*i]=joints==='knee'?1:smooth(dp/(dp+df+1e-9));
     const t=(max-p[1])/Math.max(max-min,1e-10);
     const span=Math.max(this.h.y-this.k.y,1e-6);
     // Only the periarticular region bends. Calf belly is carried by tibia,
     // thigh belly by femur; the gastrocnemius origin remains femoral.
     weights[2*i+1]=joints==='hip'?0:smooth((this.k.y+span*.04-p[1])/(span*.14));
     if(/Rectus femoris|Vastus/.test(name))weights[2*i+1]=smooth((t-.78)/.20);
     if(/Rectus femoris|Long head of biceps|Semitendinosus|Semimembranosus|Sartorius|Gracilis/.test(name))weights[2*i]=smooth((t-.02)/.20);
     if(name==='Iliotibial tract.r'){weights[2*i]=smooth((t-.07)/.25);}
     if(name==='Tensor fasciae latae.r')weights[2*i+1]=0;
     if(name==='Calcaneal tendon.r'){weights[2*i]=1;weights[2*i+1]=1;}
     if(name==='Psoas major.r'){weights[2*i]=smooth(((max-p[1])/(max-min)-.34)/(.86-.34));weights[2*i+1]=0;}
    }
    this.entries.push({name,mesh,source,world,weights,inverse:new Matrix4().copy(matrix).invert(),version:-1,maxDisplacement:0});
   }
  }
  this.curves=new Map();for(const name of new Set(this.entries.map(e=>e.name)))if(usesMuscleCurve(name)){const parts=this.entries.filter(e=>e.name===name);if(parts.reduce((n,e)=>n+e.source.length/3,0)>20){const curve=new MuscleCurve(parts);this.curves.set(name,curve);for(const e of parts)e.curve=curve;}}
  // Longitudinal pins must use the whole named structure, never each mesh part.
  const bounds=new Map();for(const e of this.entries){let b=bounds.get(e.name)||[Infinity,-Infinity];for(let i=1;i<e.world.length;i+=3){b[0]=Math.min(b[0],e.world[i]);b[1]=Math.max(b[1],e.world[i]);}bounds.set(e.name,b);}
  for(const e of this.entries){const [lo,hi]=bounds.get(e.name);for(let i=0;i<e.weights.length/2;i++){const y=e.world[3*i+1],t=(hi-y)/Math.max(hi-lo,1e-10);if(/Rectus femoris|Long head of biceps|Semitendinosus|Semimembranosus|Sartorius|Gracilis/.test(e.name))e.weights[2*i]=smooth((t-.02)/.20);if(e.name==='Psoas major.r')e.weights[2*i]=smooth((t-.34)/.52);if(e.name==='Iliotibial tract.r')e.weights[2*i]=smooth((t-.07)/.25);if(/Rectus femoris|Vastus/.test(e.name))e.weights[2*i+1]=smooth((t-.78)/.20);}}
  // Match the legacy topological smoothing, retaining rigid end regions.
  for(const e of this.entries){for(const channel of [0,1]){const before=Float32Array.from({length:e.weights.length/2},(_,i)=>e.weights[2*i+channel]);const after=smoothWeights(e.mesh.geometry,before);for(let i=0;i<after.length;i++)e.weights[2*i+channel]=before[i]===0||before[i]===1?before[i]:after[i];}}
  const tract=this.entries.filter(e=>e.name==='Iliotibial tract.r');
  if(tract.length){const pts=[];let lo=Infinity,hi=-Infinity;for(const e of tract)for(let i=0;i<e.weights.length/2;i++){const p=[...e.world.slice(i*3,i*3+3)];lo=Math.min(lo,p[1]);hi=Math.max(hi,p[1]);if(i%Math.max(1,Math.ceil(e.weights.length/2/2300))===0){p.weight=e.weights[2*i];pts.push(p);}}
   const field=tree(pts),span=hi-lo;
   for(const e of this.entries.filter(e=>['Tensor fasciae latae.r','Gluteus maximus muscle.r'].includes(e.name)))for(let i=0;i<e.weights.length/2;i++){const p=[...e.world.slice(i*3,i*3+3)],y=(hi-p[1])/span;if(y<.10||y>.46)continue;const nearest=closest(field,p),proximity=clamp((.08*span-Math.sqrt(nearest.d2))/(.06*span)),insertion=clamp((y-.10)/.13)*clamp((.46-y)/.15),blend=.8*proximity*insertion;e.weights[2*i]=e.weights[2*i]*(1-blend)+nearest.p.weight*blend;}
  }

 }
 update(hip,knee,now=performance.now(),options={}){
  const translation=options.translation||new Vector3(),patellaRotation=options.patellaRotation||knee,patellaTranslation=options.patellaTranslation||translation;
  const changed=this.translation.distanceToSquared(translation)>1e-16||this.patellaTranslation.distanceToSquared(patellaTranslation)>1e-16||this.patellaRotation.angleTo(patellaRotation)>1e-6||1-Math.abs(this.hip.dot(hip))>1e-12||1-Math.abs(this.knee.dot(knee))>1e-12;
  if(changed){if(now-this.lastUpdate<33)return;this.lastUpdate=now;this.translation.copy(translation);this.patellaRotation.copy(patellaRotation);this.patellaTranslation.copy(patellaTranslation);this.hip.copy(hip);this.knee.copy(knee);this.version++;}
  const identity=new Quaternion(),hQ=new Quaternion(),kQ=new Quaternion(),v=new Vector3(),rest=new Vector3();
  const atRest=hip.angleTo(identity)<1e-5&&knee.angleTo(identity)<1e-5&&translation.lengthSq()<1e-16&&patellaTranslation.lengthSq()<1e-16&&patellaRotation.angleTo(identity)<1e-5;
  const femur={rotation:hip,point:p=>p.sub(this.h).applyQuaternion(hip).add(this.h)},fixed={rotation:identity,point:p=>p},tibia={rotation:hip.clone().multiply(knee),point:p=>p.sub(this.k).applyQuaternion(knee).add(this.k).add(translation).sub(this.h).applyQuaternion(hip).add(this.h)},patella={rotation:hip.clone().multiply(patellaRotation),point:p=>p.sub(this.k).applyQuaternion(patellaRotation).add(this.k).add(patellaTranslation).sub(this.h).applyQuaternion(hip).add(this.h)};
  for(const [name,curve] of this.curves||[]){if(curve.version===this.version)continue;const proximal=/Short head of biceps|Vastus|gastrocnemius|Popliteus/.test(name)?femur:fixed;const distal=/Rectus femoris|Vastus/.test(name)?patella:name==='Psoas major.r'?femur:tibia;curve.pose({proximal,distal});curve.version=this.version;}
  for(const e of this.entries){if(!e.mesh.visible||e.version===this.version)continue;
   const attr=e.mesh.geometry.attributes.position;e.maxDisplacement=0;
   if(atRest)attr.array.set(e.source);
   else for(let i=0;i<attr.count;i++){
    rest.fromArray(e.world,i*3);v.copy(rest);
    if(e.curve){e.curve.deform(rest,v);}else{
    const quad=/Rectus femoris|Vastus/.test(e.name),weight=e.weights[i*2+1];
    kQ.copy(identity).slerp(quad?patellaRotation:knee,weight);v.sub(this.k).applyQuaternion(kQ).add(this.k).addScaledVector(quad?patellaTranslation:translation,weight);
    hQ.copy(identity).slerp(hip,e.weights[i*2]);v.sub(this.h).applyQuaternion(hQ).add(this.h);
    }
    e.maxDisplacement=Math.max(e.maxDisplacement,v.distanceTo(rest));v.applyMatrix4(e.inverse);attr.setXYZ(i,v.x,v.y,v.z);
   }
   attr.needsUpdate=true;e.mesh.geometry.computeVertexNormals();e.mesh.geometry.computeBoundingSphere();e.mesh.geometry.computeBoundingBox();e.version=this.version;
  }
 }
 curveAudit(){return [...this.curves||[]].map(([name,c])=>{const chord=c.end.clone().sub(c.start).normalize();let minProgress=Infinity,maxTurn=0;const samples=c.samples;for(let i=1;i<samples.length;i++){const d=samples[i].center.clone().sub(samples[i-1].center);minProgress=Math.min(minProgress,d.dot(chord));if(i>1)maxTurn=Math.max(maxTurn,d.angleTo(samples[i-1].center.clone().sub(samples[i-2].center)));}return {name,minProgress,maxTurn,length:c.length,restLength:c.restLength,scale:c.radialScale};});}
 audit(){const v=new Vector3();return this.entries.map(e=>{const matrix=e.inverse.clone().invert(),a=e.mesh.geometry.attributes.position;const step=Math.max(1,Math.ceil(a.count/300));const points=[];const indices=new Set();for(let i=0;i<a.count;i+=step)indices.add(i);let lo=0,hi=0;for(let i=1;i<a.count;i++){if(e.world[3*i+1]<e.world[3*lo+1])lo=i;if(e.world[3*i+1]>e.world[3*hi+1])hi=i;}indices.add(lo);indices.add(hi);for(const i of indices)points.push({rest:[...e.world.slice(i*3,i*3+3)],position:v.fromBufferAttribute(a,i).applyMatrix4(matrix).toArray(),hip:e.weights[i*2],knee:e.weights[i*2+1]});return {name:e.name,points};});}
 snapshot(){return this.entries.map(e=>({name:e.name,representation:e.curve?'continuous-centreline':'source-skinning',vertices:e.source.length/3,visible:e.mesh.visible,maxDisplacement:e.maxDisplacement}));}
}
