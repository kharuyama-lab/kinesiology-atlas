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

test('knee sliding and patellar translation reach distinct muscle insertions and restore',()=>{
 const mesh=points=>new Mesh(new BufferGeometry().setAttribute('position',new Float32BufferAttribute(points,3)));
 const bones={'Hip bone.r':mesh([1,0,0]),'Femur.r':mesh([1,-1,0]),'Tibia.r':mesh([1,-3,0])};
 const names=['Rectus femoris muscle.r','Semitendinosus muscle.r'],muscles=Object.fromEntries(names.map(n=>[n,mesh([1,0,0,1,-1,0,1,-3,0])]));
 const sources=Object.fromEntries(names.map(n=>[n,Array.from(muscles[n].geometry.attributes.position.array)]));
 const f=new TissueFollower();f.prepare({tissues:names.map(n=>[n,n,'muscle','hip knee']),getMeshes:n=>[muscles[n]||bones[n]],hipCenter:new Vector3(1,0,0),kneeCenter:new Vector3(1,-2,0)});
 const identity=new Quaternion(),translation=new Vector3(0,.2,.3),patellaTranslation=new Vector3(0,.1,-.1);
 f.update(identity,identity,100,{translation,patellaRotation:identity,patellaTranslation});
 for(const [name,delta] of [[names[0],patellaTranslation],[names[1],translation]]){
 const a=muscles[name].geometry.attributes.position;assert.ok(new Vector3().fromBufferAttribute(a,2).distanceTo(new Vector3(1,-3,0).add(delta))<1e-6);assert.ok(new Vector3().fromBufferAttribute(a,0).distanceTo(new Vector3(1,0,0))<1e-6);
 }
 f.update(identity,identity,200);for(const name of names)assert.deepEqual(Array.from(muscles[name].geometry.attributes.position.array),sources[name]);
});

test('gastrocnemius origin stays femoral while calf belly and Achilles follow the lower leg',()=>{
 const mesh=points=>new Mesh(new BufferGeometry().setAttribute('position',new Float32BufferAttribute(points,3)));
 const bones={'Hip bone.r':mesh([1,0,0]),'Femur.r':mesh([1,-1,0]),'Tibia.r':mesh([1,-3,0])};
 const calf=mesh([1,-1.8,0,1,-2.5,0,1,-3.8,0]),tendon=mesh([1,-3.8,0,1,-4,0,1,-4.2,0]),names=['Medial head of gastrocnemius.r','Calcaneal tendon.r'];
 const f=new TissueFollower(),h=new Vector3(1,0,0),k=new Vector3(1,-2,0);f.prepare({tissues:names.map(n=>[n,n,'muscle','knee']),getMeshes:n=>[n===names[0]?calf:n===names[1]?tendon:bones[n]],hipCenter:h,kneeCenter:k});
 const hip=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-Math.PI/2),knee=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),Math.PI/2),translation=new Vector3(0,.1,.2);
 f.update(hip,knee,100,{translation});
 const read=(m,i)=>new Vector3().fromBufferAttribute(m.geometry.attributes.position,i),femoral=p=>p.sub(h).applyQuaternion(hip).add(h),tibial=p=>femoral(p.sub(k).applyQuaternion(knee).add(k).add(translation));
 assert.ok(read(calf,0).distanceTo(femoral(new Vector3(1,-1.8,0)))<1e-6);assert.ok(read(calf,1).distanceTo(tibial(new Vector3(1,-2.5,0)))<1e-6);assert.ok(read(calf,2).distanceTo(read(tendon,0))<1e-6);
});
