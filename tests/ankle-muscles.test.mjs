import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,BufferGeometry,Float32BufferAttribute,Vector3,Matrix4} from 'three';
import {ankleMuscles,ankleStaticMuscles} from '../config/ankle-muscles.js';
import {AnkleMuscleFollower} from '../src/ankle-muscle-follow.js';
import {AchillesRoute} from '../src/ankle-achilles.js';
import {resolveMuscleContact} from '../src/ankle-muscle-contact.js';
import {BoneSurface} from '../src/bone-surface.js';
import {muscleGroups} from '../src/muscle-groups.js';
import {tissues,relevant} from '../src/anatomy.js';

test('ankle muscle scope is unique, retains shared knee structures and excludes sheaths',()=>{
 assert.equal(new Set(tissues.map(t=>t[0])).size,tissues.length);
 for(const [name] of ankleMuscles){assert.ok(relevant(name,'ankle'),name);assert.doesNotMatch(name,/sheath|bursa/i);}
 assert.equal(ankleStaticMuscles.length,15);for(const [name] of ankleStaticMuscles)assert.ok(relevant(name,'ankle'),name);
 for(const name of ['Medial head of gastrocnemius.r','Lateral head of gastrocnemius.r','Calcaneal tendon.r'])assert.ok(relevant(name,'knee'));
});
test('free Achilles preserves length and width while the muscle absorbs excursion and the insertion follows the heel',()=>{
 const shank=new Matrix4(),pivot=new Vector3(-.08,.065,-.04),source=[];
 for(let y=.03;y<=.25;y+=.01)for(const x of [-.085,-.075])source.push(new Vector3(x,y,-.08));
 const route=new AchillesRoute(source,.06),free=source.filter(p=>p.y>.08);
 for(const angle of [-40,-20,0,10,20,0]){
  const calc=new Matrix4().makeTranslation(...pivot.toArray()).multiply(new Matrix4().makeRotationX(angle*Math.PI/180)).multiply(new Matrix4().makeTranslation(...pivot.clone().negate().toArray()));
  route.update(shank,calc);
  const insertion=source[0];assert.ok(route.tendon(insertion).distanceTo(insertion.clone().applyMatrix4(calc))<1e-10);
  const origin=new Vector3(-.08,.42,-.07);assert.ok(route.muscle(origin).distanceTo(origin)<1e-10);
  for(let i=1;i<free.length;i++)assert.ok(Math.abs(route.tendon(free[i]).distanceTo(route.tendon(free[i-1]))-free[i].distanceTo(free[i-1]))<1e-10);
  assert.ok(Math.abs(route.snapshot().length-route.snapshot().restLength)<1e-10);
  const join=new Vector3(-.08,.20,-.08);assert.ok(route.muscle(join).distanceTo(route.tendon(join))<1e-10);
 }
});
test('four ankle group selectors use the same shared filter with pronation and supination participants',()=>{
 assert.deepEqual(Object.values(muscleGroups.ankle).map(g=>g.label),['背屈筋群','底屈筋群','回内筋群','回外筋群']);
 for(const name of ['Fibularis longus muscle.r','Fibularis brevis muscle.r','Fibularis tertius muscle.r'])assert.ok(muscleGroups.ankle.pronation.names.includes(name));
 for(const name of ['Tibialis anterior muscle.r','Tibialis posterior muscle.r'])assert.ok(muscleGroups.ankle.supination.names.includes(name));
});
test('muscle collision handles a triangle interior crossing a bone even when all vertices begin outside',()=>{
 const bone=new Mesh(new BoxGeometry(.02,.02,.02));bone.updateMatrixWorld(true);const surface=new BoneSurface(bone,[bone]);
 const mesh=new Mesh(new BufferGeometry().setAttribute('position',new Float32BufferAttribute([-.03,0,0,.03,0,0,0,.025,0],3)).setIndex([0,1,2]));mesh.updateMatrixWorld(true);
 const rest=[new Vector3(-.03,0,.04),new Vector3(.03,0,.04),new Vector3(0,.025,.04)],points=[new Vector3(-.03,0,0),new Vector3(.03,0,0),new Vector3(0,.025,0)];
 const frames=new Map([['bone',{bone,surface,inverse:new Matrix4(),box:surface.tree.box.clone()}]]);
 const entry={mesh,rest,owners:rest.map(()=>({pin:false}))};assert.ok(surface.insideLocal(points.reduce((p,q)=>p.add(q),new Vector3()).multiplyScalar(1/3)));
 resolveMuscleContact(entry,points,frames);
 assert.equal(surface.insideLocal(points.reduce((p,q)=>p.add(q),new Vector3()).multiplyScalar(1/3)),false);
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
 const held=mesh.geometry.attributes.position.array.slice();mesh.visible=false;bone.rotation.z=-.25;scene.updateMatrixWorld(true);follower.update(true);
 assert.deepEqual(mesh.geometry.attributes.position.array,held,'hidden geometry may stay cached');mesh.visible=true;follower.update(true);
 assert.ok(position(2).distanceTo(new Vector3().fromArray(source,6).applyMatrix4(bone.matrixWorld))<1e-8,'showing the muscle must recompute even with an unchanged current bone pose');
 bone.quaternion.identity();bone.position.set(0,0,0);scene.updateMatrixWorld(true);follower.update(true);assert.deepEqual(mesh.geometry.attributes.position.array,source);
 follower.update(false);mesh.geometry.attributes.position.setX(0,123);follower.update(false);assert.equal(mesh.geometry.attributes.position.getX(0),123,'inactive ankle must not rewrite the Knee/Hip follower');
});
