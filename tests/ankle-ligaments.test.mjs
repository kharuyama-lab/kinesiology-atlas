import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group,Mesh,BufferGeometry,Float32BufferAttribute,MeshBasicMaterial,Vector3} from 'three';
import {AnkleLigamentFollower} from '../src/ankle-ligament-follow.js';

for(const [name,distal] of [['Posterior tibiotalar ligament.r','Talus.r'],['Anterior tibiofibular ligament.r','Fibula.r']])test(`${name}: both ends contact bone surfaces despite initial gaps and remain attached during motion`,()=>{
 const scene=new Scene(),aBone=new Group(),bBone=new Group(),source=new Group();scene.add(aBone,bBone,source);bBone.position.set(.02,0,0);
 const makeMesh=points=>new Mesh(new BufferGeometry().setAttribute('position',new Float32BufferAttribute(points,3)),new MeshBasicMaterial());
 const a=makeMesh([0,-.002,0,0,.002,0,0,0,.002]),b=makeMesh([0,-.002,0,0,.002,0,0,0,.002]);aBone.add(a);bBone.add(b);
 const points=[];for(let i=0;i<=10;i++)for(const [y,z] of [[-.001,0],[.001,0],[0,.001]])points.push(.003+i*.0014,y,z);const mesh=makeMesh(points);source.add(mesh);scene.updateMatrixWorld(true);
 aBone.userData.za_name='Tibia.r';bBone.userData.za_name=distal;
 const geometry=mesh.geometry,original=Array.from(geometry.attributes.position.array),registered=new Map([['Tibia.r',aBone],[distal,bBone]]),getMeshes=n=>n==='Tibia.r'?[a]:n===distal?[b]:n===name?[mesh]:[];
 const follower=new AnkleLigamentFollower();follower.prepare({registered,getMeshes});assert.equal(follower.entries.length,1);assert.notEqual(mesh.geometry,geometry);
 assert.ok(follower.snapshot()[0].sourceGaps.every(g=>g>.002),'fixture starts with detached source endpoints');
 for(let i=0;i<5;i++){aBone.position.set(.01,.004,-.002);aBone.quaternion.setFromAxisAngle(new Vector3(0,1,0),.2);bBone.position.set(.025,.005,.003);bBone.quaternion.setFromAxisAngle(new Vector3(0,0,1),-.4);follower.update();for(const e of follower.audit()){assert.ok(e.finite);assert.ok(e.maxAnchorError<1e-8);assert.ok(e.maxSurfaceGap<1e-8);assert.ok(e.byBone[distal]<1e-8);assert.ok(e.byBone['Tibia.r']<1e-8);}aBone.position.set(0,0,0);aBone.quaternion.identity();bBone.position.set(.02,0,0);bBone.quaternion.identity();follower.update();assert.ok(follower.audit()[0].maxRestError<1e-8);}
 assert.deepEqual(Array.from(geometry.attributes.position.array),original,'shared source geometry is not deformed');
});
