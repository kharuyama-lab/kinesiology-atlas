import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {simmSpline} from '../src/simm-spline.js';
import {kneePose,kneeTranslation} from '../src/joint-motion.js';
import {KNEE_REFERENCE as data} from '../config/knee-reference.js';
test('SIMM knots, endpoint extrapolation and cubic derivatives agree',()=>{
 const f=simmSpline([-2,-1,0,1,2],[-8,-1,0,1,8]);
 for(const x of [-1.7,-.4,.3,1.8]){assert.ok(Math.abs(f(x)-x**3)<1e-12);assert.ok(Math.abs(f(x,1)-3*x*x)<1e-12);}
 assert.ok(Math.abs(f(3)-(8+12))<1e-12);assert.equal(f(3,2),0);
 for(const curve of [data.ap,data.superior]){const g=simmSpline(curve.x,curve.y);curve.x.forEach((x,i)=>assert.ok(Math.abs(g(x)-curve.y[i])<1e-12));}
});
test('roll-slide is a rest-preserving rigid transform, reversible and angle-dependent',()=>{
 assert.equal(kneeTranslation(0).length(),0);
 const points=[new Vector3(0,-.3,.01),new Vector3(.02,-.05,.03)];
 const centers=[];
 for(const angle of [0,30,60,90,120,120,60,0]){
  const p=kneePose('flex',angle,-1),q=kneePose('flex',angle,-1);
  assert.ok(p.translation.distanceTo(q.translation)<1e-14);
  const transformed=points.map(v=>v.clone().applyQuaternion(p.knee).add(p.translation));
  assert.ok(Math.abs(transformed[0].distanceTo(transformed[1])-points[0].distanceTo(points[1]))<1e-12);
  const restored=transformed[0].clone().sub(p.translation).applyQuaternion(p.knee.clone().invert());assert.ok(restored.distanceTo(points[0])<1e-12);
  centers.push(p.instantaneous.point);
  assert.equal(p.extrapolated,angle>120);
 }
 assert.ok(centers[2].distanceTo(centers[4])>.005);
 assert.ok(kneePose('flex',90,-1).translation.length()>.01);
 assert.equal(kneePose('flex',90,-1,{anatomy:true}).translation.length(),0);
 assert.equal(kneePose('flex',90,-1,{coupled:false}).translation.length(),0);
});
test('instantaneous screw axis is derived from full bone motion, not an animated marker',()=>{
 for(const angle of [5,30,60,90,119]){
  const p=kneePose('flex',angle,-1),h=.0001,rad=2*h*Math.PI/180;
  const a=kneePose('flex',angle-h,-1),b=kneePose('flex',angle+h,-1);
  const {point,direction}=p.instantaneous;
  const local=point.clone().sub(p.translation).applyQuaternion(p.knee.clone().invert());
  const velocity=local.clone().applyQuaternion(b.knee).add(b.translation).sub(local.clone().applyQuaternion(a.knee).add(a.translation)).divideScalar(rad);
  assert.ok(velocity.clone().cross(direction).length()<1e-7);
 }
});
