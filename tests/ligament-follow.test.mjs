import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BufferGeometry,Float32BufferAttribute,Vector3} from 'three';
import {LigamentFollower} from '../src/ligament-follow.js';

test('ligament end collars follow full bone translation/rotation and restore without source mutation',()=>{
 const root=new Group(),femur=new Group(),tibia=new Group();root.add(femur,tibia);tibia.position.y=-2;
 const source=[-.1,0,0,.1,0,0,-.1,-.1,0,.1,-.1,0,-.1,-1,0,.1,-1,0,-.1,-1.9,0,.1,-1.9,0,-.1,-2,0,.1,-2,0];
 const original=new BufferGeometry().setAttribute('position',new Float32BufferAttribute(source,3)),mesh=new Mesh(original);femur.add(mesh);root.updateMatrixWorld(true);
 const follower=new LigamentFollower();follower.prepare({getMeshes:name=>name==='Anterior cruciate ligament.r'?[mesh]:[],bones:{femur,'Tibia.r':tibia}});
 tibia.rotation.x=Math.PI/2;tibia.position.set(.2,-2,.3);root.rotation.z=.3;root.updateMatrixWorld(true);mesh.visible=false;follower.update();mesh.visible=true;
 const actual=i=>mesh.localToWorld(new Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i));
 assert.ok(actual(0).distanceTo(femur.localToWorld(new Vector3(-.1,0,0)))<1e-6);
 assert.ok(actual(8).distanceTo(tibia.localToWorld(new Vector3(-.1,0,0)))<1e-6);
 assert.ok(Array.from(mesh.geometry.attributes.position.array).every(Number.isFinite));
 assert.deepEqual(Array.from(original.attributes.position.array),Array.from(new Float32Array(source)));
 root.rotation.set(0,0,0);tibia.rotation.set(0,0,0);tibia.position.set(0,-2,0);root.updateMatrixWorld(true);follower.update();
 const restored=Array.from(mesh.geometry.attributes.position.array);restored.forEach((v,i)=>assert.ok(Math.abs(v-source[i])<1e-6));
 assert.ok(Math.abs(follower.snapshot()[0].spanRatio-1)<1e-6);
});

test('LCL teaching take-up straightens the body while preserving both attachment collars',()=>{
 const root=new Group(),femur=new Group(),fibula=new Group();root.add(femur,fibula);fibula.position.y=-2;
 const source=[-.1,0,0,.1,0,0,-.1,-.1,0,.1,-.1,0,.4,-1,0,.6,-1,0,-.1,-1.9,0,.1,-1.9,0,-.1,-2,0,.1,-2,0];
 const mesh=new Mesh(new BufferGeometry().setAttribute('position',new Float32BufferAttribute(source,3)));femur.add(mesh);root.updateMatrixWorld(true);
 const follower=new LigamentFollower();follower.prepare({getMeshes:name=>name==='Fibular collateral ligament.r'?[mesh]:[],bones:{femur,'Fibula.r':fibula}});
 follower.update({lcl:0});const a=mesh.geometry.attributes.position,slack=(a.getX(4)+a.getX(5))/2;
 follower.update({lcl:1});const taut=(a.getX(4)+a.getX(5))/2;
 assert.ok(slack>.45);assert.ok(Math.abs(taut)<1e-6);
 for(const i of [0,1,8,9])assert.ok(new Vector3().fromBufferAttribute(a,i).distanceTo(new Vector3().fromArray(source,i*3))<1e-6);
 follower.update({lcl:0});assert.ok(Math.abs((a.getX(4)+a.getX(5))/2-slack)<1e-6);
});
