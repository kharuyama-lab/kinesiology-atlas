import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,BufferGeometry,Float32BufferAttribute,Vector3,Matrix4} from 'three';
import {ankleMuscles,ankleStaticMuscles} from '../config/ankle-muscles.js';
import {AnkleMuscleFollower,calfPoint} from '../src/ankle-muscle-follow.js';
import {tissues,relevant} from '../src/anatomy.js';

test('ankle muscle scope is unique, retains shared knee structures and excludes sheaths',()=>{
 assert.equal(new Set(tissues.map(t=>t[0])).size,tissues.length);
 for(const [name] of ankleMuscles){assert.ok(relevant(name,'ankle'),name);assert.doesNotMatch(name,/sheath|bursa/i);}
 assert.equal(ankleStaticMuscles.length,15);for(const [name] of ankleStaticMuscles)assert.ok(relevant(name,'ankle'),name);
 for(const name of ['Medial head of gastrocnemius.r','Lateral head of gastrocnemius.r','Calcaneal tendon.r'])assert.ok(relevant(name,'knee'));
});
test('calf keeps free cross sections and upper bed, follows the heel and never amplifies heel travel or folds under DF/PF',()=>{
 const shank=new Matrix4(),insertion=new Vector3(-.08,.03,-.085),pivot=new Vector3(-.08,.065,-.04);
 for(const angle of [-40,-20,20]){
  const calc=new Matrix4().makeTranslation(...pivot.toArray()).multiply(new Matrix4().makeRotationX(angle*Math.PI/180)).multiply(new Matrix4().makeTranslation(...pivot.clone().negate().toArray()));
  const heelTravel=insertion.distanceTo(insertion.clone().applyMatrix4(calc));
  assert.ok(calfPoint(insertion,shank,calc,insertion).distanceTo(insertion.clone().applyMatrix4(calc))<1e-10);
  const origin=new Vector3(-.08,.42,-.07);assert.ok(calfPoint(origin,shank,calc,insertion).distanceTo(origin)<1e-10);
  let previous=Infinity;
  for(let y=.35;y>=.045;y-=.005){
   const left=new Vector3(-.11,y,-.08),right=new Vector3(-.05,y,-.08),a=calfPoint(left,shank,calc,insertion),b=calfPoint(right,shank,calc,insertion);
   assert.ok(Math.abs(a.distanceTo(b)-.06)<1e-10,'preserve cross-sectional width');
   assert.ok(a.distanceTo(left)<=heelTravel+1e-10,'heel motion must not rotate/amplify across the calf belly');
   assert.ok(a.y<previous,'no longitudinal fold');previous=a.y;
  }
 }
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
