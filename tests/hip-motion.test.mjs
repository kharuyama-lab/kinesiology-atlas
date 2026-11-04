import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Quaternion,Vector3} from 'three';
import {hipPose,hipRanges,hipActions,hipMuscleAction,hipLigamentScore} from '../src/hip-motion.js';
import {readFileSync} from 'node:fs';
test('Hip uses the legacy reviewed directions, ranges and actions',()=>{
 const legacy=readFileSync('legacy/hip/index.html','utf8');
 assert.match(legacy,/AXIS_SIGN=\{abd:-1,rot:-1\}/);
 assert.deepEqual(hipRanges.flex.slice(0,2),[-20,110]);assert.deepEqual(hipRanges.abd.slice(0,2),[-25,45]);assert.deepEqual(hipRanges.rot.slice(0,2),[-45,45]);
 for(const side of [-1,1])for(const [kind,axis,sign] of [['flex',[1,0,0],-1],['abd',[0,0,1],-side],['rot',[0,1,0],-side]])assert.ok(hipPose(kind,30,side).angleTo(new Quaternion().setFromAxisAngle(new Vector3(...axis),sign*Math.PI/6))<1e-7);
 assert.equal(Object.keys(hipActions).length,23);assert.equal(hipMuscleAction('Rectus femoris muscle.r','flex',80),1);assert.equal(hipMuscleAction('Semitendinosus muscle.r','flex',80),-1);
 assert.equal(hipLigamentScore('Descending part of iliofemoral ligament.r','flex',-20),1);assert.equal(hipLigamentScore('Descending part of iliofemoral ligament.r','flex',90),0);
});
