import {Vector3,Matrix4,Quaternion} from 'three';
import {geometryInFrame,radialSurface} from './surface-geometry.js';
import {estimateCondyleAxis} from './knee-calibration.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
export const routeFamily=name=>/Rectus femoris|Vastus/.test(name)?'quadriceps':/gastrocnemius/.test(name)?'calf':/Sartorius|Gracilis|Semitendinosus|Semimembranosus/.test(name)?'medial':/biceps femoris/.test(name)?'biceps':/Popliteus/.test(name)?'popliteus':null;
// Static, source-mesh cortical envelopes. Used for exclusion, not tissue force.
export class FemoralEnvelope{
 constructor(meshes){const geometry=geometryInFrame(meshes,new Matrix4()),fit=estimateCondyleAxis(geometry.vertices.map(p=>p.toArray()));if(!fit)throw Error('Femoral route envelope unavailable');this.center=new Vector3(...fit.center);const distal=geometry.vertices.filter(p=>p.y<this.center.y+.10);this.x0=Math.min(...distal.map(p=>p.x));this.x1=Math.max(...distal.map(p=>p.x));this.nx=21;this.na=81;this.a0=-70*Math.PI/180;this.a1=120*Math.PI/180;this.radial=[];
  for(let x=0;x<this.nx;x++){const origin=this.center.clone();origin.x=this.x0+(this.x1-this.x0)*x/(this.nx-1);for(let i=0;i<this.na;i++){const a=this.a0+(this.a1-this.a0)*i/(this.na-1),n=new Vector3(0,-Math.sin(a),Math.cos(a)),hit=radialSurface(geometry.triangles,origin,n,.16);this.radial.push(hit?hit.clone().sub(origin).dot(n):NaN);}}
  const raw=[...this.radial];for(let row=0;row<this.nx;row++)for(let col=0;col<this.na;col++){const index=row*this.na+col;if(!Number.isFinite(raw[index]))continue;let sum=0,w=0;for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const x=Math.max(0,Math.min(this.nx-1,row+dx)),z=Math.max(0,Math.min(this.na-1,col+dz)),a=raw[x*this.na+z],q=(dx?1:2)*(dz?1:2);if(Number.isFinite(a)){sum+=a*q;w+=q;}}this.radial[index]=Math.max(raw[index],sum/w);}
  this.y0=this.center.y-.065;this.z0=this.center.z-.105;this.step=.006;this.ny=36;this.nz=34;this.medial=[];
  for(let y=0;y<this.ny;y++)for(let z=0;z<this.nz;z++){const origin=new Vector3(this.center.x,this.y0+y*this.step,this.z0+z*this.step),hit=radialSurface(geometry.triangles,origin,new Vector3(1,0,0),.20);this.medial.push(hit?hit.x:NaN);}
 }
 interpolate(array,nx,nz,x,z){if(x<0||z<0||x>nx-1||z>nz-1)return NaN;const i=Math.min(nx-2,Math.floor(x)),j=Math.min(nz-2,Math.floor(z)),u=x-i,v=z-j;let sum=0,w=0;for(let corner=0;corner<4;corner++){const dx=corner&1,dz=corner>>1,q=(dx?u:1-u)*(dz?v:1-v),a=array[(j+dz)*nx+i+dx];if(Number.isFinite(a)){sum+=a*q;w+=q;}}return w>.6?sum/w:NaN;}
 radialRadius(p){const dy=p.y-this.center.y,dz=p.z-this.center.z,a=Math.atan2(-dy,dz),x=(p.x-this.x0)/(this.x1-this.x0)*(this.nx-1),z=(a-this.a0)/(this.a1-this.a0)*(this.na-1);return this.interpolate(this.radial,this.na,this.nx,z,x);}
 referenceGap(p){const r=this.radialRadius(p);return Number.isFinite(r)?Math.max(.001,Math.min(.035,Math.hypot(p.y-this.center.y,p.z-this.center.z)-r)):.0015;}
 front(p,clearance=.0015){if(p.y>this.center.y+.10)return p;const radius=this.radialRadius(p);if(!Number.isFinite(radius))return p;const dy=p.y-this.center.y,dz=p.z-this.center.z,length=Math.hypot(dy,dz);if(length<radius+clearance&&length>1e-8){const f=(radius+clearance)/length;p.y=this.center.y+dy*f;p.z=this.center.z+dz*f;}return p;}
 medialX(p){return this.interpolate(this.medial,this.nz,this.ny,(p.z-this.z0)/this.step,(p.y-this.y0)/this.step);}
 outsideMedial(p,clearance=.003){const x=this.medialX(p);if(Number.isFinite(x)&&p.x<x+clearance)p.x=x+clearance;return p;}
}
export class MuscleRoutes{
 constructor({getMeshes,hipCenter,kneeCenter,entries,curves,envelope=null}){this.getMeshes=getMeshes;this.h=hipCenter.clone();this.k=kneeCenter.clone();this.envelope=envelope||new FemoralEnvelope(getMeshes('Femur.r'));this.curves=curves;let lo=Infinity,hi=-Infinity;for(const mesh of getMeshes('Patella.r')){mesh.updateWorldMatrix(true,false);const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=new Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);lo=Math.min(lo,p.y);hi=Math.max(hi,p.y);}}this.patellaBottom=lo;this.patellaTop=hi;this.quadUpper=new Map();for(const e of entries){if(routeFamily(e.name)!=='quadriceps')continue;let min=Infinity;for(let i=1;i<e.world.length;i+=3)min=Math.min(min,e.world[i]);if(min>hi&&min<hi+.055)this.quadUpper.set(e.name,Math.max(this.quadUpper.get(e.name)||hi,min));}this.entries=entries;this.tmp=new Vector3();this.a=new Vector3();this.b=new Vector3();this.c=new Vector3();this.calfShifts=new Map();this.medialRoutes=new Map();this.q=new Quaternion();for(const e of entries){e.routeClearance=new Float32Array(e.world.length/3);for(let i=0;i<e.world.length/3;i++){this.tmp.fromArray(e.world,i*3);const family=routeFamily(e.name);if(family==='quadriceps')e.routeClearance[i]=this.envelope.referenceGap(this.tmp);if(family==='medial'){const x=this.envelope.medialX(this.tmp);e.routeClearance[i]=Number.isFinite(x)?Math.max(.002,Math.min(.018,this.tmp.x-x)):.003;}}}}
 update(hip,knee,{translation,patellaRotation,patellaTranslation,flexion=0,kneeActive}){this.hip=hip;this.knee=knee;this.translation=translation;this.pq=patellaRotation;this.pt=patellaTranslation;this.flexFactor=smooth(flexion/20);this.blend=kneeActive===undefined?this.flexFactor:kneeActive;this.hipInverse=hip.clone().invert();this.tibialRotation=hip.clone().multiply(knee);this.calfShifts.clear();this.medialRoutes.clear();this.lcl=[];for(const mesh of this.getMeshes('Fibular collateral ligament.r')){mesh.updateWorldMatrix(true,false);const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i+=Math.max(1,Math.ceil(a.count/180)))this.lcl.push(new Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld));}for(const [name,c] of this.curves){if(routeFamily(name)==='calf')this.calfShifts.set(name,this.world(c.a.clone()).sub(this.world(this.tibial(c.a.clone()))));}}
 tibial(p){return p.sub(this.k).applyQuaternion(this.knee).add(this.k).add(this.translation);}
 patellar(p){return p.sub(this.k).applyQuaternion(this.pq).add(this.k).add(this.pt);}
 world(p){return p.sub(this.h).applyQuaternion(this.hip).add(this.h);}
 local(p){return p.sub(this.h).applyQuaternion(this.hipInverse).add(this.h);}
 // A smooth course over the entire muscle, rather than a second local
 // deformation grafted onto an already displaced body. Sections retain width.
 wholeRoute(name,curve){if(this.medialRoutes.has(name))return this.medialRoutes.get(name);
  const tb=clamp((curve.hi-(this.k.y-.02))/curve.span),sourceEnd=curve.source(tb),start=curve.start.clone(),end=this.world(this.tibial(sourceEnd.clone())),chord=end.clone().sub(start),length=chord.length(),src=sourceEnd.clone().sub(curve.a),rotation=new Quaternion().setFromUnitVectors(src.clone().normalize(),chord.clone().normalize());
  const distalTangent=curve.source(tb).sub(curve.source(Math.max(0,tb-.02))).normalize().applyQuaternion(this.tibialRotation),c1=start.clone().addScaledVector(chord,.33),c2=end.clone().addScaledVector(distalTangent,-length*.10),samples=[];
  for(let i=0;i<=128;i++){const t=i/128,u=1-t,p=start.clone().multiplyScalar(u*u*u).addScaledVector(c1,3*u*u*t).addScaledVector(c2,3*u*t*t).addScaledVector(end,t*t*t),residual=curve.source(t*tb).sub(curve.a.clone().lerp(sourceEnd,t)).applyQuaternion(rotation);p.addScaledVector(residual,.25*Math.sin(Math.PI*t)**2);
   if(!/Popliteus/.test(name)){this.local(p);const before=p.clone();this.envelope.outsideMedial(p,/Sartorius/.test(name)?.014:.003);p.lerp(before,1-Math.sin(Math.PI*t)**2);this.world(p);}
   samples.push({p,q:new Quaternion()});}
  if(/Sartorius/.test(name)){
   // At crossings only, keep the sartorial sheet superficial (+ medial X)
   // to the other pes/medial flexors; do not change either bony attachment.
   const peers=[...this.curves].filter(([n])=>/Gracilis|Semitendinosus|Semimembranosus/.test(n));
   for(let i=1;i<128;i++){const p=samples[i].p,t=i/128;let outer=p.x;for(const [n,c] of peers){const route=this.wholeRoute(n,c);for(let j=0;j<=128;j+=2){const q=route[j].p,d=Math.hypot(p.y-q.y,p.z-q.z);if(d<.025)outer=Math.max(outer,q.x+.012*(1-d/.025));}}p.x+=(outer-p.x)*smooth(t/.15)*smooth((1-t)/.15);}
  }
  // Smooth the sampled guide itself, including wrapping correction, before
  // orienting sections. End positions are invariant.
  for(let pass=0;pass<12;pass++){const old=samples.map(s=>s.p.clone());for(let i=1;i<128;i++)samples[i].p.copy(old[i]).multiplyScalar(.5).addScaledVector(old[i-1],.25).addScaledVector(old[i+1],.25);}
  for(let i=0;i<=128;i++){const t=i/128,ds=curve.source(Math.min(tb,(t+1/128)*tb)).sub(curve.source(Math.max(0,(t-1/128)*tb))).normalize(),dt=samples[Math.min(128,i+1)].p.clone().sub(samples[Math.max(0,i-1)].p).normalize();const frame=new Quaternion().slerp(this.tibialRotation,t);samples[i].q.setFromUnitVectors(ds.applyQuaternion(frame),dt).multiply(frame);}
  samples.tb=tb;this.medialRoutes.set(name,samples);return samples;
 }
 deform(e,rest,base,out,index=-1){const family=routeFamily(e.name);if(!family||!this.blend)return out.copy(base);const sourceY=rest.y,curve=e.curve,t=curve?clamp((curve.hi-sourceY)/curve.span):0,p=this.tmp;
  if(family==='quadriceps'){
   const patellaTop=this.quadUpper.get(e.name)||this.patellaTop,upper=patellaTop+.075,lower=Math.max(this.patellaBottom-.060,curve?curve.lo+.010:-Infinity);
   if(sourceY>patellaTop){const w=smooth((upper-sourceY)/(upper-patellaTop));p.copy(rest).lerp(this.patellar(this.a.copy(rest)),w);}
   else if(sourceY>=this.patellaBottom)p.copy(this.patellar(this.a.copy(rest)));
   else p.copy(this.patellar(this.a.copy(rest))).lerp(this.tibial(this.b.copy(rest)),smooth((this.patellaBottom-sourceY)/(this.patellaBottom-lower)));
   // Exclude distal femoral cortex before applying the common hip transform.
   if(sourceY>this.patellaBottom-.005&&this.flexFactor){this.b.copy(p);this.envelope.front(p,index>=0?e.routeClearance[index]:this.envelope.referenceGap(rest));p.lerp(this.b,1-this.flexFactor);}
   this.world(p);if(curve&&e.name==='Rectus femoris muscle.r'){p.addScaledVector(curve.dp,smooth((.4-t)/.4));p.lerp(base,smooth((.35-t)/.35));}
  }else if(family==='calf'){
   if(curve?.source){const w=smooth((.30-t)/.30),source=curve.source(t,this.b),center=this.world(this.tibial(this.a.copy(source))).lerp(this.world(this.c.copy(source)),w);this.q.copy(this.tibialRotation).slerp(this.hip,w);p.copy(rest).sub(source).applyQuaternion(this.q).add(center);}else{p.copy(this.world(this.tibial(this.a.copy(rest))));if(curve)p.addScaledVector(this.calfShifts.get(e.name),smooth((.30-t)/.30));}
   // Pin the complete proximal source region, not only its lowest/highest vertex.
   const pin=Math.max(smooth((sourceY-(this.k.y+.005))/.025),index>=0?e.bonePins?.[index]||0:0);p.lerp(this.world(this.a.copy(rest)),pin);
  }else if(family==='medial'||family==='popliteus'){
   if(curve?.source){const route=this.wholeRoute(e.name,curve),rt=clamp(t/route.tb),x=rt*128,j=Math.min(127,Math.floor(x)),u=x-j,a=route[j],b=route[j+1];this.q.copy(a.q).slerp(b.q,u);p.copy(rest).sub(curve.source(t,this.b)).applyQuaternion(this.q).add(this.a.copy(a.p).lerp(b.p,u));p.lerp(base,1-this.flexFactor);if(family==='popliteus'&&this.flexFactor){let min=Infinity,x=p.x;for(const q of this.lcl){const d=Math.hypot(p.y-q.y,p.z-q.z);if(d<min){min=d;x=q.x;}}if(min<.014&&p.x<x+.004)p.x+=(x+.004-p.x)*smooth((.014-min)/.006)*this.flexFactor;}
    // The guide ends tangent to the tibia-carried source continuation.
    if(t>=route.tb)p.copy(this.world(this.tibial(this.b.copy(rest))));
   }else p.copy(base).lerp(this.world(this.tibial(this.b.copy(rest))),smooth((this.k.y+.13-sourceY)/.14));
  }else{
   p.copy(base).lerp(this.world(this.tibial(this.a.copy(rest))),smooth((this.k.y+.005-sourceY)/.035));
  }
  if(family!=='calf'&&index>=0&&e.bonePins?.[index])p.lerp(this.world(this.tibial(this.a.copy(rest))),e.bonePins[index]);
  return out.copy(base).lerp(p,this.blend);
 }
}
