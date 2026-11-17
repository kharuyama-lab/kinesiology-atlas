import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Matrix4,Mesh,PlaneGeometry,SphereGeometry} from 'three';
import {BoneSurface} from '../src/bone-surface.js';
import {MuscleExcursion} from '../src/ankle-muscle-excursion.js';
import {TissueSheet} from '../src/ankle-tissue-sheet.js';
import {smoothLigamentBody} from '../src/ankle-ligament-smoothing.js';
import {deepLigamentsForMuscle} from '../config/ankle-tissue-layers.js';

test('multi-direction bone inclusion preserves genuine inside/outside rather than expanding the collision volume',()=>{
 const bone=new Mesh(new SphereGeometry(.01,24,16));bone.updateMatrixWorld(true);const surface=new BoneSurface(bone,[bone]);
 for(const point of [new Vector3(),new Vector3(.008,0,0),new Vector3(0,.008,0)])assert.equal(surface.insideLocalStable(point),true);
 for(const point of [new Vector3(.009,.009,.009),new Vector3(-.009,.009,-.009),new Vector3(.02,0,0)])assert.equal(surface.insideLocalStable(point),false);
});

test('whole belly shortens and elongates along the source course while the origin remains fixed',()=>{
 const body=[],tendon=[];for(let y=.20;y<=.401;y+=.01)body.push(new Vector3(-.01,y,0),new Vector3(.01,y,0));for(let y=.05;y<=.211;y+=.01)tendon.push(new Vector3(0,y,0));
 const model=new MuscleExcursion('test',[{tendon:false,rest:body},{tendon:true,rest:tendon}]),identity=new Matrix4();
 for(const lengthening of [-.01,.01]){
  model.update({shank:identity,pose:p=>p.clone().add(new Vector3(0,-lengthening,0))});
  assert.equal(Math.sign(model.excursion),Math.sign(lengthening));
  const origin=new Vector3(0,.4,0);assert.ok(model.point(origin,false,p=>p.clone()).distanceTo(origin)<1e-8);
  for(const y of [.35,.30,.25]){const p=new Vector3(0,y,0),q=model.point(p,false,p=>p.clone());assert.ok(p.distanceTo(q)>.0005,'upper and middle belly must move, not only the distal end');assert.ok(Math.abs(q.x)<1e-10&&Math.abs(q.z)<1e-10,'retain the source course');}
 }
 model.update({shank:identity,pose:p=>p.clone()});const p=new Vector3(0,.3,0);assert.ok(model.point(p,false,p=>p.clone()).distanceTo(p)<1e-10);
});
test('regional layer constraint clears a crossing without imposing the wrong long plantar/peroneal order',()=>{
 const mesh=new Mesh(new PlaneGeometry(.02,.02));mesh.updateMatrixWorld(true);const frame={delta:new Matrix4(),surface:{world:new Matrix4()}},sheet=new TissueSheet(mesh,()=>({frame,local:new Vector3(0,0,1),sourceWorld:true}));
 const correction=sheet.project(new Vector3(0,0,-.001));assert.ok(correction);assert.ok(correction.move.z>.001);
 assert.equal(sheet.project(new Vector3(0,0,.002)),null);assert.equal(sheet.project(new Vector3(.03,0,-.001)),null);
 assert.ok(deepLigamentsForMuscle('Fibularis longus muscle.r').includes('Calcaneofibular'));
 assert.ok(!deepLigamentsForMuscle('Fibularis longus muscle.r').includes('Long plantar'));
});
test('ligament route transitions are bounded in the moving bone frame, with exact terminal attachments',()=>{
 const oldBase=Array.from({length:5},(_,i)=>new Vector3(i*.01,0,0)),base=oldBase.map(p=>p.clone().add(new Vector3(0,0,.004))),anchors=new Map([[0,{}],[4,{}]]),target=base.map((p,i)=>p.clone().add(new Vector3(0,anchors.has(i)?0:.01,0)));
 let previous=oldBase.map(p=>p.clone()),previousBase=oldBase;
 for(let step=0;step<160;step++){
  const carried=previous.map((p,i)=>p.clone().add(base[i]).sub(previousBase[i]));const result=smoothLigamentBody({previous,previousBase,base,target,anchors,faces:[],dt:.02,valid:()=>true,escape:()=>null});
  for(const i of anchors.keys())assert.ok(result.positions[i].distanceTo(base[i])<1e-12);
  for(let i=1;i<4;i++)assert.ok(result.positions[i].distanceTo(carried[i])<=.015*.02+1e-10);
  previous=result.positions;previousBase=base;if(!result.settling)break;
 }
 assert.ok(previous[2].distanceTo(target[2])<.000005);
});
