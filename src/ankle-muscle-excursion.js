import {Vector3} from 'three';
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const mean=points=>points.reduce((s,p)=>s.add(p),new Vector3()).multiplyScalar(1/points.length);
// Material points slide along the original source course. This is a geometric
// length-excursion display, not activation, fascicle pennation or force.
class SourceCourse{
 constructor(points,hi,lo){this.hi=hi;this.lo=lo;this.points=[];const span=hi-lo;
  for(let i=0;i<=24;i++){const y=hi-span*i/24,near=points.filter(p=>Math.abs(p.y-y)<Math.max(.004,span/14));const p=mean(near.length?near:points);p.y=y;this.points.push(p);}
  for(let pass=0;pass<4;pass++)this.points=this.points.map((p,i)=>i===0||i===24?p:p.clone().multiplyScalar(.5).addScaledVector(this.points[i-1],.25).addScaledVector(this.points[i+1],.25));
 }
 at(y){const t=(this.hi-y)/(this.hi-this.lo)*24,i=Math.max(0,Math.min(23,Math.floor(t))),u=t-i;return this.points[i].clone().lerp(this.points[i+1],u);}
 slide(p,distance){const a=this.at(p.y),b=this.at(p.y-distance);return p.clone().add(b.sub(a));}
}
export class MuscleExcursion{
 constructor(name,parts){
  this.name=name;const bellies=parts.filter(e=>!e.tendon),body=bellies.flatMap(e=>e.rest);this.available=body.length>0&&parts.some(e=>e.tendon);
  if(!this.available)return;
  this.hi=Math.max(...body.map(p=>p.y));this.lo=Math.min(...body.map(p=>p.y));this.span=this.hi-this.lo;
  this.body=new SourceCourse(body,this.hi,this.lo);const tendons=parts.filter(e=>e.tendon).flatMap(e=>e.rest);
  this.tendon=new SourceCourse(tendons.length?tendons:body,this.hi,Math.min(.04,this.lo));
  const low=tendons.filter(p=>p.y<this.lo+.005);this.route=[this.body.at(this.lo)];
  for(let y=this.lo-.012;y>.045;y-=.015){const near=low.filter(p=>Math.abs(p.y-y)<.006);if(near.length)this.route.push(mean(near));}
  const distal=low.length?low:parts.flatMap(e=>e.rest),maxZ=Math.max(...distal.map(p=>p.z));this.route.push(mean(distal.filter(p=>p.z>maxZ-.003)));
  this.restRoute=this.length(this.route);this.excursion=0;this.residual=new Vector3();
 }
 length(points){let n=0;for(let i=1;i<points.length;i++)n+=points[i].distanceTo(points[i-1]);return n;}
 update({shank,pose,tendonPose=null}){
  if(!this.available)return;
  this.shank=shank;const junction=this.body.at(this.lo),fixed=junction.clone().applyMatrix4(shank);
  if(tendonPose){const moved=tendonPose(junction),axis=this.body.at(this.lo-.002).sub(junction).normalize().transformDirection(shank),delta=moved.sub(fixed);this.excursion=delta.dot(axis);this.residual.copy(delta).addScaledVector(axis,-this.excursion);}
  else{this.excursion=this.length(this.route.map((p,i)=>i===0?p.clone().applyMatrix4(shank):pose(p)))-this.restRoute;this.residual.set(0,0,0);}
  this.excursion=Math.max(-this.span*.18,Math.min(this.span*.18,this.excursion));
 }
 point(p,tendon,pose,tendonPose=null){
  if(!this.available)return pose(p);
  const t=smooth((this.hi-p.y)/this.span);
  if(!tendon||p.y>=this.lo){const moved=this.body.slide(p,this.excursion*t).applyMatrix4(this.shank);return moved.addScaledVector(this.residual,t);}
  if(tendonPose)return tendonPose(p);
  const slide=this.excursion*smooth((p.y-.035)/Math.max(.015,this.lo-.035))*smooth((.005-p.z)/.025);return pose(this.tendon.slide(p,slide));
 }
 snapshot(){return {name:this.name,available:this.available,sourceLength:this.span,bellyLength:this.span+this.excursion,excursion:this.excursion,proximalY:this.hi,junctionY:this.lo};}
}
