import {Vector3,Quaternion} from 'three';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
const curved=/Rectus femoris|biceps femoris|Semitendinosus|Semimembranosus|Sartorius|Gracilis|gastrocnemius/;
export const usesMuscleCurve=name=>curved.test(name);
// One continuous centreline cage per named structure, shared by every mesh part.
// Original vertices/indices are retained. This is a visual deformation, not force.
export class MuscleCurve{
 constructor(entries){this.entries=entries;this.name=entries[0].name;this.lo=Infinity;this.hi=-Infinity;for(const e of entries)for(let i=1;i<e.world.length;i+=3){this.lo=Math.min(this.lo,e.world[i]);this.hi=Math.max(this.hi,e.world[i]);}this.span=this.hi-this.lo;this.centres=[];
  for(let j=0;j<=24;j++){const t=j/24,y=this.hi-t*this.span,c=new Vector3(),wspan=this.span/16;let sum=0;for(const e of entries)for(let i=0;i<e.world.length;i+=3){const d=Math.abs(e.world[i+1]-y),w=Math.max(0,1-d/wspan);if(w){c.x+=e.world[i]*w;c.z+=e.world[i+2]*w;sum+=w;}}if(sum){c.x/=sum;c.z/=sum;}c.y=y;this.centres.push(c);}
  for(let pass=0;pass<5;pass++){const next=this.centres.map(p=>p.clone());for(let i=1;i<24;i++)for(const k of ['x','z'])next[i][k]=(this.centres[i-1][k]+2*this.centres[i][k]+this.centres[i+1][k])/4;this.centres=next;}
  this.a=this.source(0);this.b=this.source(1);this.restLength=this.a.distanceTo(this.b);this.tmpSource=new Vector3();this.tmpCenter=new Vector3();this.tmpRotation=new Quaternion();
 }
 source(t,out=new Vector3()){const x=clamp(t)*24,i=Math.min(23,Math.floor(x)),u=x-i,p=this.centres;const a=p[Math.max(0,i-1)],b=p[i],c=p[i+1],d=p[Math.min(24,i+2)];const v=out;for(const k of ['x','z'])v[k]=.5*((2*b[k])+(-a[k]+c[k])*u+(2*a[k]-5*b[k]+4*c[k]-d[k])*u*u+(-a[k]+3*b[k]-3*c[k]+d[k])*u*u*u);v.y=this.hi-clamp(t)*this.span;return v;}
 pose({proximal,distal}){this.proximal=proximal;this.distal=distal;this.start=proximal.point(this.a.clone());this.end=distal.point(this.b.clone());this.length=this.start.distanceTo(this.end);this.radialScale=Math.max(.85,Math.min(1.18,Math.sqrt(this.restLength/Math.max(this.length,1e-8))));this.samples=[];
  // A cubic course with controls in the transverse plane has strictly
  // forward progress along the endpoint chord: no hairpins or local reversals.
  const chord=this.end.clone().sub(this.start),axis=chord.clone().normalize(),controls=[this.start];
  for(const t of [1/3,2/3]){const q=proximal.rotation.clone().slerp(distal.rotation,smooth(t));const offset=this.source(t).sub(this.a.clone().lerp(this.b,t)).applyQuaternion(q);offset.addScaledVector(axis,-offset.dot(axis));if(offset.length()>this.length*.08)offset.setLength(this.length*.08);controls.push(this.start.clone().addScaledVector(chord,t).add(offset));}controls.push(this.end);
  for(let i=0;i<=128;i++){const t=i/128,u=1-t,q=proximal.rotation.clone().slerp(distal.rotation,smooth(t)),rest=this.source(t);const center=controls[0].clone().multiplyScalar(u**3).addScaledVector(controls[1],3*u*u*t).addScaledVector(controls[2],3*u*t*t).addScaledVector(controls[3],t**3);this.samples.push({t,rest,center,q});}

  for(let i=0;i<this.samples.length;i++){const prev=this.samples[Math.max(0,i-1)],next=this.samples[Math.min(128,i+1)],s=this.samples[i],srcT=next.rest.clone().sub(prev.rest).normalize(),dstT=next.center.clone().sub(prev.center).normalize(),align=new Quaternion().setFromUnitVectors(srcT.clone().applyQuaternion(s.q),dstT);const envelope=Math.sin(Math.PI*s.t)**2;s.rotation=new Quaternion().identity().slerp(align,envelope).multiply(s.q);}
 }
 deform(rest,out){const t=clamp((this.hi-rest.y)/Math.max(this.span,1e-9)),x=t*128,i=Math.min(127,Math.floor(x)),u=x-i,a=this.samples[i],b=this.samples[i+1];const center=this.tmpCenter.copy(a.center).lerp(b.center,u),q=this.tmpRotation.copy(a.rotation).slerp(b.rotation,u),source=this.source(t,this.tmpSource),scale=1+(this.radialScale-1)*Math.sin(Math.PI*t)**2;return out.copy(rest).sub(source).multiplyScalar(scale).applyQuaternion(q).add(center);}
}
