import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ankleTensionCues,ankleTensionAppearance} from '../src/ankle-ligament-presentation.js';
test('evidence cues distinguish DF/PF and do not invent unsupported motion effects',()=>{
 const df=ankleTensionCues('flex',20),pf=ankleTensionCues('flex',-40);
 for(const n of ['Tibiocalcaneal ligament.r','Posterior tibiotalar ligament.r']){
  assert.equal(df[n].engagement,1);assert.equal(df[n].slack,0);
  assert.equal(pf[n].engagement,0);assert.equal(pf[n].slack,1);
 }
 assert.equal(pf['Tibionavicular ligament.r'].engagement,1);
 assert.equal(df['Tibionavicular ligament.r'].slack,1);
 assert.deepEqual(ankleTensionCues('unknown',-10),{});
 assert.deepEqual(ankleTensionCues('adduct',-10),{});
 assert.deepEqual(ankleTensionCues('flex',20,false),{});
 for(const c of Object.values(ankleTensionCues('flex',0)))assert.deepEqual(c,{engagement:0,slack:0});
 let previous=0;for(let v=0;v<=20;v+=.1){const next=ankleTensionCues('flex',v)['Tibiocalcaneal ligament.r'].engagement;assert.ok(next>=previous&&next-previous<.008);previous=next;}
});
test('coupled controls use the same physical coronal component and distinguish restraint evidence',()=>{
 const axis={y:.6691306063588582,z:.7123682726604061};
 for(const v of [-10,0,20]){
  const a=ankleTensionCues('invert',v,true,axis),b=ankleTensionCues('compound',v,true,axis),c=ankleTensionCues('adduct',v*axis.y/axis.z,true,axis);
  assert.deepEqual(a,b);
  for(const n of Object.keys(a))assert.ok(Math.abs(a[n].engagement-c[n].engagement)<1e-12);
  assert.equal(a['Talocalcaneal interosseous ligament.r'].basis,'restraint');
  assert.equal(a['Talocalcaneal interosseous ligament.r'].slack,0);
  assert.equal(a['Tibiocalcaneal ligament.r'].slack,0);
  assert.equal(a['Tibiocalcaneal ligament.r'].engagement,v<0?1:0);
  assert.ok(!('Tibionavicular ligament.r' in a));
 }
});
test('same-color engagement pulse remains visible, resets at neutral and respects Fade/Off',()=>{
 const low=ankleTensionAppearance(1,1200),high=ankleTensionAppearance(1,400);
 assert.ok(high.glow>low.glow&&low.glow>0);
 assert.ok(high.darkening>low.darkening);
 assert.equal(ankleTensionAppearance(0,400).glow,0);
 assert.equal(ankleTensionAppearance(0,400).darkening,0);
 assert.equal(ankleTensionAppearance(1,400,'off').glow,0);
 assert.equal(ankleTensionAppearance(1,400,'fade').glow,high.glow*.25);
 assert.ok(ankleTensionAppearance(.01,400).glow>0);
});
