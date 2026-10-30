import {test} from 'node:test';import assert from 'node:assert/strict';
import {Vector3,Quaternion} from 'three';
import {surfaceSupport,meniscalDisplacement,rootWeight} from '../src/meniscus-follow.js';
import {kneePose} from '../src/joint-motion.js';
test('screw-home is coupled 3D rotation; extension preserves the anatomical lock reference',()=>{
 const a=kneePose('flex',0,-1),b=kneePose('flex',20,-1),c=kneePose('flex',90,-1);
 assert.equal(a.coupledAxial,0);assert.equal(a.knee.w,1);assert.equal(b.coupledAxial,-9);assert.equal(c.coupledAxial,-9);
 const pure=kneePose('flex',90,-1,{coupledRotationOverride:0});
 const anterior=new Vector3(0,0,1).applyQuaternion(c.knee);assert.ok(anterior.x>0);assert.ok(c.knee.angleTo(pure.knee)>.15);
 assert.ok(kneePose('flex',10,-1).coupledAxial<0);assert.ok(kneePose('flex',10,-1).coupledAxial>-9);
});
test('support uses inverse full 3D transform, not flexion angle or world-axis shifts',()=>{
 const points=[new Vector3(0,0,0),new Vector3(.01,.002,.01),new Vector3(-.01,.004,-.01)],q=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),.3),t=new Vector3(.004,.006,-.002);
 const rest=surfaceSupport(points,new Quaternion(),new Vector3());
 const moved=surfaceSupport(points.map(p=>p.clone().applyQuaternion(q).add(t)),q,t);
 assert.ok(rest.distanceTo(moved)<1e-12);
 const shift=surfaceSupport(points,new Quaternion(),new Vector3(.003,0,.004)).sub(rest);assert.ok(shift.distanceTo(new Vector3(-.003,0,-.004))<1e-12);
});
test('meniscal deformation pins estimated roots, differentiates compartments and remains bounded',()=>{
 const roots=[new Vector3(0,0,0),new Vector3(0,0,.03)];assert.equal(rootWeight(roots[0],roots),0);assert.equal(rootWeight(roots[1],roots),0);assert.equal(rootWeight(new Vector3(.02,0,.01),roots),1);
 const zero=new Vector3(),delta=new Vector3(.01,.3,-.01),m=meniscalDisplacement(delta,zero,'medial'),l=meniscalDisplacement(delta,zero,'lateral');
 assert.equal(m.y,0);assert.equal(l.y,0);assert.ok(l.z<m.z);assert.ok(Math.abs(m.z)<=.008);assert.ok(Math.abs(l.z)<=.012);assert.equal(meniscalDisplacement(zero,zero,'medial').length(),0);
 assert.ok(m.distanceTo(meniscalDisplacement(delta,zero,'medial'))<1e-14);
});
