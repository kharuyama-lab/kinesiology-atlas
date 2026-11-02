import {Vector3,Quaternion} from 'three';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
const curved=/Rectus femoris|Vastus|biceps femoris|Semitendinosus|Semimembranosus|Sartorius|Gracilis|gastrocnemius/;
export const usesMuscleCurve=name=>curved.test(name);
// Shared source-shape deformation per named structure. Sampled centres retain
// the original course; they are not replaced by an endpoint chord.
// Original vertices/indices are retained. This is a visual deformation, not force.
export class MuscleCurve{
 constructor(entries){this.entries=entries;this.name=entries[0].name;this.lo=Infinity;this.hi=-Infinity;for(const e of entries)for(let i=1;i<e.world.length;i+=3){this.lo=Math.min(this.lo,e.world[i]);this.hi=Math.max(this.hi,e.world[i]);}this.span=this.hi-this.lo;this.centres=[];
  for(let j=0;j<=24;j++){const t=j/24,y=this.hi-t*this.span,c=new Vector3(),wspan=this.span/16;let sum=0;for(const e of entries)for(let i=0;i<e.world.length;i+=3){const d=Math.abs(e.world[i+1]-y),w=Math.max(0,1-d/wspan);if(w){c.x+=e.world[i]*w;c.z+=e.world[i+2]*w;sum+=w;}}if(sum){c.x/=sum;c.z/=sum;}c.y=y;this.centres.push(c);}
  for(let pass=0;pass<5;pass++){const next=this.centres.map(p=>p.clone());for(let i=1;i<24;i++)for(const k of ['x','z'])next[i][k]=(this.centres[i-1][k]+2*this.centres[i][k]+this.centres[i+1][k])/4;this.centres=next;}
  const cap=y=>{const c=new Vector3();let n=0;for(const e of entries)for(let i=0;i<e.world.length;i+=3)if(Math.abs(e.world[i+1]-y)<1e-8){c.add(new Vector3().fromArray(e.world,i));n++;}return c.multiplyScalar(1/n);};this.a=cap(this.hi);this.b=cap(this.lo);this.centres[0].copy(this.a);this.centres[24].copy(this.b);this.restLength=this.a.distanceTo(this.b);this.tmpSource=new Vector3();this.tmpCenter=new Vector3();this.tmpRotation=new Quaternion();
 }
 source(t,out=new Vector3()){const x=clamp(t)*24,i=Math.min(23,Math.floor(x)),u=x-i,p=this.centres;const a=p[Math.max(0,i-1)],b=p[i],c=p[i+1],d=p[Math.min(24,i+2)];const v=out;for(const k of ['x','z'])v[k]=.5*((2*b[k])+(-a[k]+c[k])*u+(2*a[k]-5*b[k]+4*c[k]-d[k])*u*u+(-a[k]+3*b[k]-3*c[k]+d[k])*u*u*u);v.y=this.hi-clamp(t)*this.span;return v;}
 pose({proximal,distal,body,via}){this.via=via;this.proximal=proximal;this.distal=distal;this.body=body||proximal;this.start=proximal.point(this.a.clone());this.end=distal.point(this.b.clone());this.length=this.start.distanceTo(this.end);this.radialScale=1;this.dp=this.start.clone().sub(this.body.point(this.a.clone()));this.dd=this.end.clone().sub(this.body.point(this.b.clone()));this.determinant=1-this.dd.clone().sub(this.dp).applyQuaternion(this.body.rotation.clone().invert()).y/this.span;this.samples=[];this.guided=/Rectus femoris|Vastus|Sartorius/.test(this.name);this.viaT=via?Math.max(.7,Math.min(.94,(this.hi-via.y)/this.span)):null;this.dv=via?via.point(this.source(this.viaT)).sub(this.body.point(this.source(this.viaT))):null;this.determinant=Infinity;for(let i=0;i<=128;i++){const t=i/128,a=this.weights(Math.max(0,t-1e-5)),b=this.weights(Math.min(1,t+1e-5)),dt=Math.min(1,t+1e-5)-Math.max(0,t-1e-5);const derivative=this.dp.clone().multiplyScalar((b[0]-a[0])/dt).addScaledVector(this.dd,(b[1]-a[1])/dt).applyQuaternion(this.body.rotation.clone().invert());this.determinant=Math.min(this.determinant,1-derivative.y/this.span);}
  for(let i=0;i<=128;i++){const t=i/128,rest=this.source(t),[wp,wd]=this.weights(t),center=this.body.point(rest.clone()).addScaledVector(this.dp,wp).addScaledVector(this.dd,wd);if(this.via){center.copy(this.body.point(rest.clone())).addScaledVector(this.dp,wp);if(t<=this.viaT)center.addScaledVector(this.dv,smooth((t-.65)/(this.viaT-.65)));else{const u=smooth((t-this.viaT)/(1-this.viaT));center.addScaledVector(this.dv,1-u).addScaledVector(this.dd,u);}}this.samples.push({t,rest,center});}
  if(this.guided){for(let i=0;i<=128;i++){const a=this.samples[Math.max(0,i-1)],b=this.samples[Math.min(128,i+1)],p=this.samples[i],src=b.rest.clone().sub(a.rest).normalize().applyQuaternion(this.body.rotation),dst=b.center.clone().sub(a.center).normalize();p.rotation=new Quaternion().setFromUnitVectors(src,dst).multiply(this.body.rotation);}this.determinant=Infinity;for(let i=1;i<128;i+=2){const p=this.samples[i].rest,h=this.span*1e-4,base=this.deform(p,new Vector3()),columns=[];for(const axis of ['x','y','z']){const v=p.clone();v[axis]+=h;columns.push(this.deform(v,new Vector3()).sub(base).multiplyScalar(1/h));}this.determinant=Math.min(this.determinant,columns[0].dot(columns[1].cross(columns[2])));}}

 }
 // Preserve original source sections. Quadriceps use a femur/patella/tibia
 // guide; other long muscles use a complete-surface displacement field.
 // No endpoint-chord fitting or artificial radial scaling.
 weights(t){return this.guided?[smooth((.4-t)/.4),smooth((t-.65)/.35)]:[1-t,t];}
 deform(rest,out){const t=clamp((this.hi-rest.y)/Math.max(this.span,1e-9));if(this.guided){const x=t*128,i=Math.min(127,Math.floor(x)),u=x-i,a=this.samples[i],b=this.samples[i+1],q=this.tmpRotation.copy(a.rotation).slerp(b.rotation,u),c=this.tmpCenter.copy(a.center).lerp(b.center,u);return out.copy(rest).sub(this.source(t,this.tmpSource)).applyQuaternion(q).add(c);}const [wp,wd]=this.weights(t);out.copy(rest);this.body.point(out);return out.addScaledVector(this.dp,wp).addScaledVector(this.dd,wd);}

}
