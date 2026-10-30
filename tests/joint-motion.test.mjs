import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {kneePose} from '../src/joint-motion.js';
test('Knee starting positions, anatomical identity and angle limits',()=>{
 for(const kind of ['flex','rot','stress']){
  const rest=kneePose(kind,90,-1,{anatomy:true});assert.equal(rest.hip.angleTo(rest.knee),0);assert.equal(rest.hip.w,1);
 }
 assert.equal(kneePose('flex',90,-1).angles.flex,90);
 assert.equal(kneePose('rot',0,-1).angles.flex,90);
 assert.equal(kneePose('stress',0,-1).angles.flex,30);
 assert.equal(kneePose('flex',999,-1).angles.flex,140);
 // Hip 90 + knee 90 returns the distal tibial direction to inferior.
 const p=kneePose('flex',90,-1);const distal=new Vector3(0,-1,0).applyQuaternion(p.knee).applyQuaternion(p.hip);
 assert.ok(distal.distanceTo(new Vector3(0,-1,0))<1e-10);
});
test('right external rotation and valgus move toward the anatomical lateral side',()=>{
 const external=kneePose('rot',20,-1);const undoFlex=new Vector3(0,0,1).applyQuaternion(external.knee);
 // A tibial anterior marker turns toward the right (negative X) in external rotation.
 assert.ok(undoFlex.x<0);
 for(const side of [-1,1]){
  const valgus=new Vector3(0,-1,0).applyQuaternion(kneePose('stress',3,side).knee);
  const varus=new Vector3(0,-1,0).applyQuaternion(kneePose('stress',-3,side).knee);
  assert.ok(valgus.x*side>0);assert.ok(varus.x*side<0);
 }
 assert.equal(kneePose('flex',0,-1).screw,9);
 assert.equal(kneePose('flex',90,-1).screw,0);
});
