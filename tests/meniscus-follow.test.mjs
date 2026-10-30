import {test} from 'node:test';import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {meniscalExcursion,rootWeight} from '../src/meniscus-follow.js';
import {MENISCI} from '../config/menisci.js';
import {kneePose} from '../src/joint-motion.js';
test('screw-home is coupled 3D rotation; extension preserves the anatomical lock reference',()=>{
 const a=kneePose('flex',0,-1),b=kneePose('flex',20,-1),c=kneePose('flex',90,-1);
 assert.equal(a.coupledAxial,0);assert.equal(a.knee.w,1);assert.equal(b.coupledAxial,-9);assert.equal(c.coupledAxial,-9);
 const pure=kneePose('flex',90,-1,{coupledRotationOverride:0});
 const anterior=new Vector3(0,0,1).applyQuaternion(c.knee);assert.ok(anterior.x>0);assert.ok(c.knee.angleTo(pure.knee)>.15);
 assert.ok(kneePose('flex',10,-1).coupledAxial<0);assert.ok(kneePose('flex',10,-1).coupledAxial>-9);
});
test('meniscal body excursion is posterior, reversible, bounded and greater laterally',()=>{
 for(const angle of [0,10,30,60,90,120,90,30,0]){
  const m=meniscalExcursion(angle,'medial'),l=meniscalExcursion(angle,'lateral');
  assert.equal(m.x,0);assert.equal(m.y,0);assert.ok(m.z<=0);assert.ok(l.z<=m.z);assert.ok(Math.abs(l.z)<=.012);
  assert.ok(m.distanceTo(meniscalExcursion(angle,'medial'))<1e-14);
 }
 assert.equal(meniscalExcursion(0,'lateral').length(),0);assert.equal(meniscalExcursion(120,'medial').z,-.006);assert.equal(meniscalExcursion(120,'lateral').z,-.012);
});
test('meniscal deformation pins estimated roots, differentiates compartments and remains bounded',()=>{
 const roots=[new Vector3(0,0,0),new Vector3(0,0,.03)];assert.equal(rootWeight(roots[0],roots),0);assert.equal(rootWeight(roots[1],roots),0);assert.equal(rootWeight(new Vector3(.02,0,.01),roots),1);
 // For p' = p + displacement*w(p), this Lipschitz bound keeps the local
 // deformation from reversing orientation even at maximal excursion.
 assert.ok(1.5*MENISCI.lateral.posteriorExcursion/MENISCI.rootRadius<1);
});
