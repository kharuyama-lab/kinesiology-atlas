import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group,Mesh,BufferGeometry,Float32BufferAttribute,MeshBasicMaterial,Vector3} from 'three';
import {AnkleLigamentFollower} from '../src/ankle-ligament-follow.js';

test('Ankle source collars follow both bone frames and restore source mesh without mutating shared geometry',()=>{
 const scene=new Scene(),aBone=new Group(),bBone=new Group(),source=new Group();scene.add(aBone,bBone,source);bBone.position.set(.02,0,0);
 const makeMesh=points=>new Mesh(new BufferGeometry().setAttribute('position',new Float32BufferAttribute(points,3)),new MeshBasicMaterial());
 const a=makeMesh([0,-.002,0,0,.002,0,0,0,.002]),b=makeMesh([0,-.002,0,0,.002,0,0,0,.002]);aBone.add(a);bBone.add(b);
 const points=[];for(let i=0;i<=10;i++)for(const [y,z] of [[-.001,0],[.001,0],[0,.001]])points.push(i*.002,y,z);const mesh=makeMesh(points);source.add(mesh);scene.updateMatrixWorld(true);
 const geometry=mesh.geometry,original=Array.from(geometry.attributes.position.array),registered=new Map([['Tibia.r',aBone],['Talus.r',bBone]]),getMeshes=name=>name==='Tibia.r'?[a]:name==='Talus.r'?[b]:name==='Posterior tibiotalar ligament.r'?[mesh]:[];
 const follower=new AnkleLigamentFollower();follower.prepare({registered,getMeshes});assert.equal(follower.entries.length,1);assert.notEqual(mesh.geometry,geometry);
 for(let i=0;i<5;i++){aBone.position.set(.01,.004,-.002);aBone.quaternion.setFromAxisAngle(new Vector3(0,1,0),.2);bBone.position.set(.025,.005,.003);bBone.quaternion.setFromAxisAngle(new Vector3(0,0,1),-.4);follower.update();for(const e of follower.audit()){assert.ok(e.finite);assert.ok(e.maxAnchorError<1e-8);}aBone.position.set(0,0,0);aBone.quaternion.identity();bBone.position.set(.02,0,0);bBone.quaternion.identity();follower.update();assert.ok(follower.audit()[0].maxRestError<1e-8);}
 assert.deepEqual(Array.from(geometry.attributes.position.array),original,'shared source geometry is not deformed');
});
