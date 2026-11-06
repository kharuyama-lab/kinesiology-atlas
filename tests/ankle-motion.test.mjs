import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Scene,Group,Vector3} from 'three';
import {AnkleMotion} from '../src/ankle-motion.js';
const calibration=JSON.parse(fs.readFileSync('config/ankle.json','utf8'));
const audit=JSON.parse(fs.readFileSync('docs/ANKLE_GLB_AUDIT.json','utf8'));
function fixture(){const scene=new Scene(),parent=new Group(),registered=new Map();scene.add(parent);for(const n of audit.assets.skeletal.nodes){const g=new Group();g.position.fromArray(n.bounds.center);scene.add(g);registered.set(n.zaName,g);}scene.updateMatrixWorld(true);const original=new Map([...registered].map(([n,o])=>[n,o.matrixWorld.clone()])),rig=new AnkleMotion();rig.prepare({registered,parent,calibration});return {scene,rig,registered,original};}
test('Ankle preserves source rest transforms, individual bone rigidity, left and shank frames over repeated cycles',()=>{
 const {scene,rig,registered,original}=fixture(),point=n=>registered.get(n).getWorldPosition(new Vector3());
 const toePair=()=>point('Distal phalanx of first finger of foot.r').distanceTo(point('Distal phalanx of fifth finger of foot.r')),distance=toePair();
 for(let cycle=0;cycle<6;cycle++)for(const [kind,angle] of [['flex',20],['flex',-40],['invert',20],['invert',-10],['adduct',15],['adduct',-10],['compound',20],['compound',-15]]){
  rig.set(kind,angle,true);rig.update(10,true,true);scene.updateMatrixWorld(true);
  assert.ok(Math.abs(toePair()-distance)<1e-10,'toes remain rigidly associated with the forefoot');
  for(const [name,obj] of registered){assert.ok(obj.matrixWorld.elements.every(Number.isFinite));assert.ok(Math.abs(obj.matrixWorld.determinant()-1)<1e-10);if(name.endsWith('.l')||/^(Tibia|Fibula)/.test(name))assert.deepEqual(obj.matrixWorld.elements,original.get(name).elements);}
  rig.set(kind,0,true);rig.update(10,true,true);scene.updateMatrixWorld(true);for(const [name,obj] of registered)for(let k=0;k<16;k++)assert.ok(Math.abs(obj.matrixWorld.elements[k]-original.get(name).elements[k])<1e-10,'source rest recovered: '+name);
 }
 assert.equal(new Set(rig.bones.map(b=>b.obj.uuid)).size,27);
});
test('Ankle follows right-side anatomical signs and uses the same ST reference without added TC rotation',()=>{
 const {scene,rig,registered}=fixture(),p=n=>registered.get(n).getWorldPosition(new Vector3());
 const toe='Distal phalanx of second finger of foot.r',medial='First metatarsal bone.r',lateral='Fifth metatarsal bone.r',restToe=p(toe),restTilt=p(medial).y-p(lateral).y;
 const apply=(kind,v)=>{rig.set(kind,v,true);rig.update(10,true,true);scene.updateMatrixWorld(true);};
 apply('flex',20);assert.ok(p(toe).y>restToe.y,'dorsiflexion raises toes');apply('flex',-20);assert.ok(p(toe).y<restToe.y,'plantarflexion lowers toes');
 apply('invert',10);assert.ok(p(medial).y-p(lateral).y>restTilt,'inversion raises medial border relative to lateral');const inversion=p(toe);apply('compound',10);assert.ok(p(toe).distanceTo(inversion)<1e-10,'compound uses the same ST-based reference without invented TC motion');assert.equal(rig.excursions.tc,0);
 apply('adduct',10);assert.ok(p(toe).x>restToe.x,'right adduction points medially');apply('adduct',-10);assert.ok(p(toe).x<restToe.x,'right abduction points laterally');
});
test('single displayed axis matches the actual segment motion and TC pivot, including at rest and limits',()=>{
 const {scene,rig}=fixture();
 const apply=(kind,value)=>{rig.set(kind,value,true);rig.update(10,true,true);scene.updateMatrixWorld(true);};
 for(const [kind,value] of [['flex',0],['flex',20],['flex',-40],['invert',0],['adduct',10],['compound',0],['compound',12]]){
  apply(kind,value);const {point,direction}=rig.resultant;assert.equal(rig.axisObjects.filter(e=>e.group.visible).length,1);assert.ok(Math.abs(direction.length()-1)<1e-12);
  if(kind==='flex')assert.ok(new Vector3().crossVectors(rig.centers.tc.clone().sub(point),direction).length()<1e-7,'TC axis passes through its pivot');
  const local=rig.mt.worldToLocal(point.clone()),h=value===20||value===-40?-.0001:.0001,range=kind==='flex'?[-40,20]:[-100,100];
  const step=Math.max(range[0],Math.min(range[1],value+h))-value;if(!step)continue;
  apply(kind,value+step);const velocity=rig.mt.localToWorld(local).sub(point).divideScalar(step),perpendicular=velocity.clone().addScaledVector(direction,-velocity.dot(direction));
  assert.ok(perpendicular.length()<1e-7,'points on instantaneous axis have no perpendicular velocity');
 }
 apply('compound',10);rig.update(0,true,false);assert.equal(rig.axisObjects.filter(e=>e.group.visible).length,0);
});
