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
 constructor({getMeshes,hipCenter,kneeCenter,entries,curves,envelope=null}){this.getMeshes=getMeshes;this.h=hipCenter.clone();this.k=kneeCenter.clone();this.envelope=envelope||new FemoralEnvelope(getMeshes('Femur.r'));this.curves=curves;let lo=Infinity,hi=-Infinity;for(const mesh of getMeshes('Patella.r')){mesh.updateWorldMatrix(true,false);const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=new Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);lo=Math.min(lo,p.y);hi=Math.max(hi,p.y);}}this.patellaBottom=lo;this.patellaTop=hi;this.quadUpper=new Map();for(const e of entries){if(routeFamily(e.name)!=='quadriceps')continue;let min=Infinity;for(let i=1;i<e.world.length;i+=3)min=Math.min(min,e.world[i]);if(min>hi&&min<hi+.055)this.quadUpper.set(e.name,Math.max(this.quadUpper.get(e.name)||hi,min));}this.entries=entries;this.tmp=new Vector3();this.a=new Vector3();this.b=new Vector3();this.c=new Vector3();this.calfShifts=new Map();this.medialRoutes=new Map();this.q=new Quaternion();this.attachT=new Map();for(const e of entries){const c=e.curve||curves.get(e.name);if(!c)continue;for(let i=0;i<e.world.length/3;i++)if(e.bonePins?.[i]>0){const t=clamp((c.hi-e.world[i*3+1])/c.span);this.attachT.set(e.name,Math.min(this.attachT.get(e.name)??1,t));}}this.radii=new Map();for(const [name,c] of curves){if(!c.source)continue;const radii=Array.from({length:65},()=>({x:.001,radial:.001}));for(const e of entries.filter(e=>e.name===name))for(let i=0;i<e.world.length;i+=3){const t=clamp((c.hi-e.world[i+1])/c.span),j=Math.round(t*64),center=c.source(t),dx=e.world[i]-center.x,dz=e.world[i+2]-center.z;radii[j].x=Math.max(radii[j].x,Math.abs(dx));radii[j].radial=Math.max(radii[j].radial,Math.hypot(dx,dz));}for(let pass=0;pass<3;pass++){const old=radii.map(r=>({...r}));for(let i=1;i<64;i++)for(const key of ['x','radial'])radii[i][key]=(old[i-1][key]+2*old[i][key]+old[i+1][key])/4;}this.radii.set(name,radii);}for(const e of entries){e.routeClearance=new Float32Array(e.world.length/3);for(let i=0;i<e.world.length/3;i++){this.tmp.fromArray(e.world,i*3);const family=routeFamily(e.name);if(family==='quadriceps')e.routeClearance[i]=this.envelope.referenceGap(this.tmp);if(family==='medial'){const x=this.envelope.medialX(this.tmp);e.routeClearance[i]=Number.isFinite(x)?Math.max(.002,Math.min(.018,this.tmp.x-x)):.003;}}}}
 update(hip,knee,{translation,patellaRotation,patellaTranslation,flexion=0,kneeActive}){this.hip=hip;this.knee=knee;this.translation=translation;this.pq=patellaRotation;this.pt=patellaTranslation;this.flexFactor=smooth(flexion/20);this.terminalFlex=smooth((flexion-80)/40);this.blend=kneeActive===undefined?this.flexFactor:kneeActive;this.hipInverse=hip.clone().invert();this.tibialRotation=hip.clone().multiply(knee);this.calfShifts.clear();this.medialRoutes.clear();this.quadCloud=null;this.depthFields=new Map();this.lcl=[];for(const mesh of this.getMeshes('Fibular collateral ligament.r')){mesh.updateWorldMatrix(true,false);const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i+=Math.max(1,Math.ceil(a.count/180)))this.lcl.push(new Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld));}for(const [name,c] of this.curves){if(routeFamily(name)==='calf')this.calfShifts.set(name,this.world(c.a.clone()).sub(this.world(this.tibial(c.a.clone()))));}}
 tibial(p){return p.sub(this.k).applyQuaternion(this.knee).add(this.k).add(this.translation);}
 patellar(p){return p.sub(this.k).applyQuaternion(this.pq).add(this.k).add(this.pt);}
 world(p){return p.sub(this.h).applyQuaternion(this.hip).add(this.h);}
 local(p){return p.sub(this.h).applyQuaternion(this.hipInverse).add(this.h);}
 // A smooth course over the entire muscle, rather than a second local
 // deformation grafted onto an already displaced body. Sections retain width.
 wholeRoute(name,curve){if(this.medialRoutes.has(name))return this.medialRoutes.get(name);
  const tb=/Long head of biceps/.test(name)?1:/Popliteus/.test(name)?clamp((curve.hi-(this.k.y-.02))/curve.span):Math.max(.25,(this.attachT.get(name)??1)-.025),sourceEnd=curve.source(tb),start=curve.start.clone(),end=this.world(this.tibial(sourceEnd.clone())),chord=end.clone().sub(start),length=chord.length(),src=sourceEnd.clone().sub(curve.a),rotation=new Quaternion().setFromUnitVectors(src.clone().normalize(),chord.clone().normalize());
  const shortHead=/Short head of biceps/.test(name);
  const distalTangent=curve.source(tb).sub(curve.source(Math.max(0,tb-.02))).normalize().applyQuaternion(this.tibialRotation),c1=start.clone().addScaledVector(chord,.33),c2=end.clone().addScaledVector(distalTangent,-length*(.25-(routeFamily(name)==='medial'?.09*this.terminalFlex:0))),samples=[];
  for(let i=0;i<=128;i++){const t=i/128,u=1-t,p=start.clone().multiplyScalar(u*u*u).addScaledVector(c1,3*u*u*t).addScaledVector(c2,3*u*t*t).addScaledVector(end,t*t*t),residual=curve.source(t*tb).sub(curve.a.clone().lerp(sourceEnd,t)).applyQuaternion(rotation);p.addScaledVector(residual,.25*(1-(routeFamily(name)==='medial'?.65*this.terminalFlex:0))*Math.sin(Math.PI*t)**2);

   // Keep the femoral source course; distribute distal travel and tangent
   // change over the free muscle instead of pushing it sideways under the long head.
   if(/Long head of biceps/.test(name)){
    const original=curve.source(t).sub(curve.a.clone().lerp(sourceEnd,t)).applyQuaternion(rotation);
    p.copy(start).lerp(end,t).addScaledVector(original,.35);
    // User-selected midpoint between the 05dd0ad curved guide and the
    // 6b5f42e full-insertion guide; retain the continuous support solver.
    const previousEndT=Math.max(.25,(this.attachT.get(name)??1)-.025),u=clamp(t/previousEndT),oldEnd=curve.source(previousEndT),curved=this.world(this.tibial(curve.source(t)));
    if(t<previousEndT){const bodyStart=this.world(curve.a.clone()),bodyEnd=this.world(oldEnd.clone()),proximal=start.clone().sub(bodyStart),distal=this.world(this.tibial(oldEnd.clone())).sub(bodyEnd),h=.0001;
     const derivative=curve.source(previousEndT).sub(curve.source(previousEndT-h)).multiplyScalar(previousEndT/h),native=derivative.clone().applyQuaternion(this.hip).add(distal).sub(proximal),target=derivative.applyQuaternion(this.tibialRotation);
     curved.copy(this.world(curve.source(t))).addScaledVector(proximal,1-u).addScaledVector(distal,u).addScaledVector(target.sub(native),.7*(u-1)*smooth((u-.4)/.6)**2);
    }
    p.lerp(curved,.5);
   }
   if(shortHead){
    const original=this.world(curve.source(t*tb)),carriedEnd=this.world(sourceEnd.clone()),h=.0001;
    const sourceDerivative=curve.source(tb).sub(curve.source(tb-h)).multiplyScalar(tb/h),native=sourceDerivative.clone().applyQuaternion(this.hip),target=sourceDerivative.applyQuaternion(this.tibialRotation);
    p.copy(original).addScaledVector(end.clone().sub(carriedEnd),smooth(t)).addScaledVector(target.sub(native),.9*(t-1)*smooth((t-.4)/.6)**2);
   }
   samples.push({p,q:new Quaternion()});}
  // Solve one full-length displacement amplitude, not pointwise pushes.
  // Separation includes the source sections' widths, rather than centre lines.
  if(/Sartorius|Gracilis|Semitendinosus|Semimembranosus/.test(name)){
   const deeper=/Sartorius/.test(name)?/Gracilis|Semitendinosus|Semimembranosus/:/Gracilis/.test(name)?/Semitendinosus|Semimembranosus/:/$a/;
   const peers=[...this.curves].filter(([n])=>deeper.test(n));let amplitude=0;
   for(let i=20;i<109;i++){const p=samples[i].p,t=i/128,basis=smooth(t/.3)*smooth((1-t)/.3),own=this.radii.get(name)?.[Math.round(t*tb*64)]?.x||.003;
    const local=this.local(p.clone()),surface=this.envelope.medialX(local);if(Number.isFinite(surface))amplitude=Math.max(amplitude,(surface+own+.003-local.x)/basis);
    for(const [n,c] of peers){const route=this.wholeRoute(n,c);for(let j=8;j<124;j+=2){const q=route[j].p,radius=this.radii.get(n)?.[Math.round(j*route.tb/2)]?.x||.008,d=Math.hypot(p.y-q.y,p.z-q.z);if(d<.025)amplitude=Math.max(amplitude,(q.x+(radius+own+.003)*Math.sqrt(1-(d/.025)**2)-p.x)/basis);}}
   }
   if(/Sartorius|Gracilis/.test(name)){if(!this.quadCloud){this.quadCloud=[];for(const e of this.entries.filter(e=>routeFamily(e.name)==='quadriceps'&&e.curve))for(let j=0;j<e.world.length/3;j+=Math.max(1,Math.ceil(e.world.length/3/120))){const rest=new Vector3().fromArray(e.world,j*3),base=e.curve.deform(rest,new Vector3());this.quadCloud.push(this.deform(e,rest,base,new Vector3(),j));}}for(let i=20;i<109;i++){const p=samples[i].p,t=i/128,basis=smooth(t/.3)*smooth((1-t)/.3),own=this.radii.get(name)?.[Math.round(t*tb*64)]?.x||.003;for(const q of this.quadCloud)if(Math.hypot(q.y-p.y,q.z-p.z)<.018)amplitude=Math.max(amplitude,(q.x+own+.004-p.x)/basis);}}amplitude=Math.max(0,Math.min(/Semitendinosus|Semimembranosus/.test(name)?.004:.025,amplitude));for(let i=1;i<128;i++){const t=i/128;samples[i].p.x+=amplitude*smooth(t/.3)*smooth((1-t)/.3);};samples.layerAmplitude=amplitude;
  }
  // Smooth the sampled guide itself, including wrapping correction, before
  // orienting sections. End positions are invariant.
  for(let pass=0;pass<12;pass++){const old=samples.map(s=>s.p.clone());for(let i=1;i<128;i++)samples[i].p.copy(old[i]).multiplyScalar(.5).addScaledVector(old[i-1],.25).addScaledVector(old[i+1],.25);}
  // Uniform arc-length stations distribute shortening along the complete
  // free muscle, rather than compressing just the cubic's terminal span.
  const guide=samples.map(s=>s.p.clone()),arcs=[0];for(let i=1;i<=128;i++)arcs.push(arcs[i-1]+guide[i].distanceTo(guide[i-1]));let station=1;for(let i=1;i<128;i++){const distance=arcs[128]*i/128;while(station<128&&arcs[station]<distance)station++;samples[i].p.copy(guide[station-1]).lerp(guide[station],(distance-arcs[station-1])/Math.max(1e-9,arcs[station]-arcs[station-1]));}
  const orient=()=>{for(let i=0;i<=128;i++){const t=i/128,ds=curve.source(Math.min(tb,(t+1/128)*tb)).sub(curve.source(Math.max(0,(t-1/128)*tb))).normalize(),dt=samples[Math.min(128,i+1)].p.clone().sub(samples[Math.max(0,i-1)].p).normalize();const frame=new Quaternion().slerp(this.tibialRotation,t);samples[i].q.setFromUnitVectors(ds.applyQuaternion(frame),dt).multiply(frame);}};orient();if(/Long head of biceps/.test(name))for(let pass=0;pass<2;pass++){this.supportLongHead(samples,name,curve,tb);orient();}if(/Gracilis/.test(name))for(let pass=0;pass<2;pass++){this.constrainLayer(samples,name,curve,tb);orient();}
  samples.tb=tb;this.medialRoutes.set(name,samples);return samples;
 }
 // Keep the long-head surface superficial to the short head using a smooth
 // full-muscle lateral support. The deep head and both endpoint frames stay fixed.
 supportSource(name){if(!this.supportSamples)this.supportSamples=new Map();if(this.supportSamples.has(name))return this.supportSamples.get(name);const entries=this.entries.filter(e=>e.name===name&&e.curve),count=entries.reduce((n,e)=>n+e.world.length/3,0),step=Math.max(1,Math.ceil(count/320)),samples=[];let offset=0;for(const e of entries){for(let k=(step-offset%step)%step;k<e.world.length/3;k+=step)samples.push({e,index:k,rest:new Vector3().fromArray(e.world,k*3)});offset+=e.world.length/3;}this.supportSamples.set(name,samples);return samples;}
 supportLongHead(samples,name,curve,tb){
  let cloud=this.depthFields.get('shortSurface');
  if(!cloud){cloud=[];this.depthFields.set('shortSurface',cloud);for(const {e,index,rest} of this.supportSource('Short head of biceps femoris.r')){const t=(e.curve.hi-rest.y)/e.curve.span;if(t<.1||t>.9)continue;cloud.push(this.local(this.deform(e,rest,e.curve.deform(rest,new Vector3()),new Vector3(),index)));}}
  let amplitude=0;const p=new Vector3(),q=new Quaternion();
  for(const {e,rest} of this.supportSource(name)){const t=clamp((curve.hi-rest.y)/curve.span);if(t<.1||t>.9)continue;const x=t*128,i=Math.min(127,Math.floor(x)),u=x-i;q.copy(samples[i].q).slerp(samples[i+1].q,u);p.copy(rest).sub(curve.source(t)).applyQuaternion(q).add(samples[i].p.clone().lerp(samples[i+1].p,u));this.local(p);const basis=smooth(t/.25)*smooth((1-t)/.25);for(const v of cloud){const d2=(p.y-v.y)**2+(p.z-v.z)**2,weight=Math.exp(-d2/(2*.012**2));amplitude=Math.max(amplitude,(p.x-v.x+.006)*weight/basis);}}
  const outward=new Vector3(-1,0,0).applyQuaternion(this.hip);for(let i=1;i<128;i++){const t=i/128;samples[i].p.addScaledVector(outward,Math.max(0,amplitude)*smooth(t/.25)*smooth((1-t)/.25));}
 }
 depthField(kind){let field=this.depthFields.get(kind);if(field)return field;field=new Map();this.depthFields.set(kind,field);const names=kind==='gracilis'?['Semitendinosus muscle.r','Semimembranosus muscle.r']:['Long head of biceps femoris.r'];for(const e of this.entries.filter(e=>names.includes(e.name)&&e.curve))for(let i=0;i<e.world.length/3;i++){const rest=new Vector3().fromArray(e.world,i*3),base=e.curve.deform(rest,new Vector3()),q=this.deform(e,rest,base,new Vector3(),i),key=Math.floor(q.y/.006)+','+Math.floor(q.z/.006);field.set(key,Math.max(field.get(key)??-Infinity,q.x));}return field;
 }
 constrainLayer(samples,name,curve,tb){const field=this.depthField(/Gracilis/.test(name)?'gracilis':'short'),required=new Float64Array(129),v=new Vector3(),source=new Vector3(),center=new Vector3(),q=new Quaternion();
  for(const e of this.entries.filter(e=>e.name===name))for(let k=0;k<e.world.length/3;k++){const t=clamp((curve.hi-e.world[k*3+1])/curve.span);if(t<.10||t>tb*.90)continue;const rt=t/tb,x=rt*128,i=Math.min(127,Math.floor(x)),u=x-i;q.copy(samples[i].q).slerp(samples[i+1].q,u);v.fromArray(e.world,k*3).sub(curve.source(t,source)).applyQuaternion(q).add(center.copy(samples[i].p).lerp(samples[i+1].p,u));const y=Math.floor(v.y/.006),z=Math.floor(v.z/.006),basis=smooth(rt/.15)*smooth((1-rt)/.15);let bound=-Infinity;for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++)bound=Math.max(bound,field.get((y+dy)+','+(z+dz))??-Infinity);if(Number.isFinite(bound))required[Math.round(x)]=Math.max(required[Math.round(x)],Math.max(0,bound+.004-v.x)/basis);}
  // A smooth upper envelope of actual surface violations. Its broad support
  // changes entire sections; it never pushes individual fibre vertices.
  for(let i=1;i<128;i++){let sum=0;for(let j=1;j<128;j++)if(required[j])sum+=required[j]**12*Math.exp(-6*((i-j)/20)**2);const t=i/128;samples[i].p.x+=sum**(1/12)*smooth(t/.15)*smooth((1-t)/.15);}
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
   if(curve?.source){const w=smooth((.30-t)/.30),source=curve.source(t,this.b),center=this.world(this.tibial(this.a.copy(source))).lerp(this.world(this.c.copy(source)),w);this.q.copy(this.tibialRotation).slerp(this.hip,w);p.copy(rest).sub(source).multiplyScalar(1-this.flexFactor*.6*(1-smooth(t/.30))).applyQuaternion(this.q).add(center);}else{p.copy(this.world(this.tibial(this.a.copy(rest))));if(curve)p.addScaledVector(this.calfShifts.get(e.name),smooth((.30-t)/.30));}
   // Pin the complete proximal source region, not only its lowest/highest vertex.
   const pin=index>=0?e.bonePins?.[index]||0:0;p.lerp(this.world(this.a.copy(rest)),pin);
  }else if(family==='medial'||family==='popliteus'||family==='biceps'){
   if(curve?.source){const route=this.wholeRoute(e.name,curve),rt=clamp(t/route.tb),x=rt*128,j=Math.min(127,Math.floor(x)),u=x-j,a=route[j],b=route[j+1];this.q.copy(a.q).slerp(b.q,u);p.copy(rest).sub(curve.source(t,this.b)).applyQuaternion(this.q).add(this.a.copy(a.p).lerp(b.p,u));if(family==='popliteus'&&this.flexFactor){let min=Infinity,x=p.x;for(const q of this.lcl){const d=Math.hypot(p.y-q.y,p.z-q.z);if(d<min){min=d;x=q.x;}}if(min<.014&&p.x<x+.004)p.x+=(x+.004-p.x)*smooth((.014-min)/.006)*this.flexFactor;}
    // The guide ends tangent to the tibia-carried source continuation.
    if(t>=route.tb)p.copy(this.world(this.tibial(this.b.copy(rest))));
    if(/Long head of biceps/.test(e.name)&&index>=0&&e.bonePins?.[index])p.lerp(this.world(this.tibial(this.b.copy(rest))),e.bonePins[index]);
   }else p.copy(base).lerp(this.world(this.tibial(this.b.copy(rest))),family==='biceps'?smooth((this.k.y+.005-sourceY)/.035):smooth((this.k.y+.13-sourceY)/.14));
  }else{
   p.copy(base).lerp(this.world(this.tibial(this.a.copy(rest))),smooth((this.k.y+.005-sourceY)/.035));
  }
  if(!['calf','medial','biceps'].includes(family)&&index>=0&&e.bonePins?.[index])p.lerp(this.world(this.tibial(this.a.copy(rest))),e.bonePins[index]);
  return out.copy(base).lerp(p,this.blend);
 }
}
