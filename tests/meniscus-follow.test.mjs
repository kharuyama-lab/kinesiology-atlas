import {test} from 'node:test';import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {centreTranslation,compressionFromGap,rootWeight} from '../src/meniscus-follow.js';
import {MENISCI} from '../config/menisci.js';
import {kneePose} from '../src/joint-motion.js';
test('screw-home is coupled 3D rotation; extension preserves the anatomical lock reference',()=>{
 const a=kneePose('flex',0,-1),b=kneePose('flex',20,-1),c=kneePose('flex',90,-1);
 assert.equal(a.coupledAxial,0);assert.equal(a.knee.w,1);assert.equal(b.coupledAxial,-9);assert.equal(c.coupledAxial,-9);
 const pure=kneePose('flex',90,-1,{coupledRotationOverride:0});
 const anterior=new Vector3(0,0,1).applyQuaternion(c.knee);assert.ok(anterior.x>0);assert.ok(c.knee.angleTo(pure.knee)>.15);
 assert.ok(kneePose('flex',10,-1).coupledAxial<0);assert.ok(kneePose('flex',10,-1).coupledAxial>-9);
});
test('root-weighted support centre reaches its contact target and gap closure compresses only',()=>{
 const anchor=new Vector3(.02,.003,-.01),target=new Vector3(.023,.002,-.016),influence=.8,d=centreTranslation(anchor,target,influence),achieved=anchor.clone().addScaledVector(d,influence);
 assert.ok(Math.hypot(achieved.x-target.x,achieved.z-target.z)<1e-14);assert.equal(d.y,0);
 assert.equal(compressionFromGap(.004,.004,.004),0);assert.equal(compressionFromGap(.005,.004,.004),0);assert.ok(Math.abs(compressionFromGap(.0036,.004,.004)-.1)<1e-12);assert.equal(compressionFromGap(0,.004,.004),.2);
});
test('meniscal deformation pins estimated roots, differentiates compartments and remains bounded',()=>{
 const roots=[new Vector3(0,0,0),new Vector3(0,0,.03)];assert.equal(rootWeight(roots[0],roots),0);assert.equal(rootWeight(roots[1],roots),0);assert.equal(rootWeight(new Vector3(.02,0,.01),roots),1);
 // For p' = p + displacement*w(p), this Lipschitz bound keeps the local
 // deformation from reversing orientation even at maximal excursion.
 assert.ok(1.5*MENISCI.maxCentreTravel/MENISCI.rootRadius<1);
});
