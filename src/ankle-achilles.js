import {Vector3,Quaternion} from 'three';
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const mean=points=>points.reduce((sum,p)=>sum.add(p),new Vector3()).multiplyScalar(1/points.length);
// Non-contractile free tendon: a rigid source-shape transport, with a short
// fan transition at the calcaneal footprint. Length change goes into muscle.
export class AchillesRoute{
 constructor(points,endY){
  this.endY=endY;const hi=Math.max(...points.map(p=>p.y));
  const slice=points.filter(p=>Math.abs(p.y-endY)<.004);
  this.base=mean(slice.length?slice:points.filter(p=>p.y<endY));this.base.y=endY;
  this.top=mean(points.filter(p=>p.y>hi-.003));this.axis=this.top.clone().sub(this.base).normalize();
  this.rotation=new Quaternion();this.restLength=this.top.distanceTo(this.base);this.transition=.015;
 }
 update(shank,calcaneus){
  this.shank=shank;this.calcaneus=calcaneus;this.start=this.base.clone().applyMatrix4(calcaneus);
  const direction=this.top.clone().applyMatrix4(shank).sub(this.start).normalize();
  this.rotation.setFromUnitVectors(this.axis,direction);this.end=this.start.clone().addScaledVector(direction,this.restLength);
 }
 tendon(point,out=new Vector3()){
  out.copy(point).sub(this.base).applyQuaternion(this.rotation).add(this.start);
  const footprint=1-smooth((point.y-this.endY)/this.transition);
  return out.lerp(point.clone().applyMatrix4(this.calcaneus),footprint);
 }
 muscle(point,out=new Vector3()){
  this.tendon(point,out);
  return out.lerp(point.clone().applyMatrix4(this.shank),smooth((point.y-this.top.y)/(.36-this.top.y)));
 }
 snapshot(){return {restLength:this.restLength,length:this.start.distanceTo(this.end),freeFromY:this.endY+this.transition,sourceBase:this.base.toArray(),sourceTop:this.top.toArray(),base:this.start.toArray(),top:this.end.toArray()};}
}
