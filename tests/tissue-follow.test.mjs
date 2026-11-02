import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,BufferGeometry,Float32BufferAttribute,Vector3,Quaternion} from 'three';
import {TissueFollower} from '../src/tissue-follow.js';
test('tibial endpoint follows knee, proximal endpoint stays, rest and source are preserved',()=>{
 const mesh=points=>new Mesh(new BufferGeometry().setAttribute('position',new Float32BufferAttribute(points,3)));
 const muscle=mesh([1,-3,0,1,-1,0,1,0,0]),original=muscle.geometry,source=Array.from(original.attributes.position.array);
 const bones={'Hip bone.r':mesh([1,0,0]),'Femur.r':mesh([1,-1,0]),'Tibia.r':mesh([1,-3,0])};
 const follower=new TissueFollower();follower.prepare({tissues:[['test','test','muscle','hip knee']],getMeshes:n=>[n==='test'?muscle:bones[n]],hipCenter:new Vector3(1,0,0),kneeCenter:new Vector3(1,-2,0)});
 const identity=new Quaternion(),bend=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),Math.PI/2);
 follower.update(identity,bend,100);
 assert.ok(new Vector3().fromBufferAttribute(muscle.geometry.attributes.position,0).distanceTo(new Vector3(1,-2,-1))<1e-5);
 assert.ok(new Vector3().fromBufferAttribute(muscle.geometry.attributes.position,2).distanceTo(new Vector3(1,0,0))<1e-5);
 assert.deepEqual(Array.from(original.attributes.position.array),source);
 muscle.visible=false;follower.update(identity,identity,200);muscle.visible=true;follower.update(identity,identity,300);
 assert.deepEqual(Array.from(muscle.geometry.attributes.position.array),source);
 assert.equal(follower.snapshot()[0].maxDisplacement,0);
});
