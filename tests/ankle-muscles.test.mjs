import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,BufferGeometry,Float32BufferAttribute,Vector3} from 'three';
import {ankleMuscles} from '../config/ankle-muscles.js';
import {AnkleMuscleFollower} from '../src/ankle-muscle-follow.js';
import {tissues,relevant} from '../src/anatomy.js';

test('ankle muscle scope is unique, retains shared knee structures and excludes sheaths',()=>{
 assert.equal(new Set(tissues.map(t=>t[0])).size,tissues.length);
 for(const [name] of ankleMuscles){assert.ok(relevant(name,'ankle'),name);assert.doesNotMatch(name,/sheath|bursa/i);}
 for(const name of ['Medial head of gastrocnemius.r','Lateral head of gastrocnemius.r','Calcaneal tendon.r'])assert.ok(relevant(name,'knee'));
});
test('ankle muscles transport distal collars through full bone transforms, keep origins and restore exact source',()=>{
 const scene=new Group(),registered=new Map();
 for(const name of new Set(['Femur.r','Tibia.r','Fibula.r',...ankleMuscles.map(m=>m[2])])){const mesh=new Mesh(new BoxGeometry(.005,.005,.005));scene.add(mesh);registered.set(name,mesh);}
 for(const [name] of ankleMuscles){const geometry=new BufferGeometry().setAttribute('position',new Float32BufferAttribute([.01,.15,0,.012,.08,0,.01,.02,.04],3));const mesh=new Mesh(geometry);scene.add(mesh);registered.set(name,mesh);}
 scene.updateMatrixWorld(true);const follower=new AnkleMuscleFollower();follower.prepare({registered,getMeshes:name=>[registered.get(name)]});
 const mesh=registered.get('Tibialis anterior muscle.r'),source=mesh.geometry.attributes.position.array.slice();
 follower.update(true);assert.equal(follower.audit().restError,0);
 const bone=registered.get('Medial cuneiform bone.r');bone.rotation.z=.4;bone.position.set(.01,-.02,.005);scene.updateMatrixWorld(true);follower.update(true);
 const position=i=>new Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i);
 assert.ok(position(0).distanceTo(new Vector3().fromArray(source,0))<1e-8);
 assert.ok(position(2).distanceTo(new Vector3().fromArray(source,6).applyMatrix4(bone.matrixWorld))<1e-8);
 assert.ok(follower.audit().terminalError<1e-8);assert.ok(follower.audit().finite);
 bone.quaternion.identity();bone.position.set(0,0,0);scene.updateMatrixWorld(true);follower.update(true);assert.deepEqual(mesh.geometry.attributes.position.array,source);
 follower.update(false);mesh.geometry.attributes.position.setX(0,123);follower.update(false);assert.equal(mesh.geometry.attributes.position.getX(0),123,'inactive ankle must not rewrite the Knee/Hip follower');
});
