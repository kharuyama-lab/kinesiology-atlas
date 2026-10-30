import {test} from 'node:test';import assert from 'node:assert/strict';
import {fitSphere} from '../src/knee-calibration.js';
import {kneePose} from '../src/joint-motion.js';
import {Vector3} from 'three';
test('sphere fitting recovers a known surface; degenerate inputs are rejected',()=>{
 const center=[1,2,3],radius=2,points=[];for(let a=0;a<3;a++)for(const sign of [-1,1]){const p=[...center];p[a]+=sign*radius;points.push(p);}
 const fit=fitSphere(points);assert.deepEqual(fit.center,center);assert.equal(fit.radius,radius);assert.equal(fit.rms,0);
 assert.equal(fitSphere([[0,0,0]]),null);assert.equal(fitSphere(Array.from({length:8},(_,i)=>[i,0,0])),null);
});
test('the trial flexion axis remains invariant under flexion-only rotation',()=>{
 const axis=new Vector3(.99,-.06,.02).normalize();const pose=kneePose('flex',90,-1,{flexAxis:axis.toArray()});
 assert.ok(axis.clone().applyQuaternion(pose.knee).distanceTo(axis)<1e-10);
});
