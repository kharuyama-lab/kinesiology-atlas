import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ankleTensionCues} from '../src/ankle-ligament-presentation.js';
test('evidence cues distinguish DF/PF and do not invent unsupported motion effects',()=>{
 const df=ankleTensionCues('flex',20),pf=ankleTensionCues('flex',-40);
 for(const n of ['Tibiocalcaneal ligament.r','Posterior tibiotalar ligament.r']){
  assert.equal(df[n].engagement,1);assert.equal(df[n].slack,0);
  assert.equal(pf[n].engagement,0);assert.equal(pf[n].slack,1);
 }
 assert.equal(pf['Tibionavicular ligament.r'].engagement,1);
 assert.equal(df['Tibionavicular ligament.r'].slack,1);
 for(const k of ['invert','adduct','compound'])assert.deepEqual(ankleTensionCues(k,-10),{});
 assert.deepEqual(ankleTensionCues('flex',20,false),{});
 for(const c of Object.values(ankleTensionCues('flex',0)))assert.deepEqual(c,{engagement:0,slack:0});
 let previous=0;for(let v=0;v<=20;v+=.1){const next=ankleTensionCues('flex',v)['Tibiocalcaneal ligament.r'].engagement;assert.ok(next>=previous&&next-previous<.008);previous=next;}
});
