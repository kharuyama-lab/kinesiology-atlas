import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {tissues,focusStates,nextVisibility,relevant,japaneseName} from '../src/anatomy.js';
test('visibility cycle and focus relevance',()=>{
 assert.equal(nextVisibility(nextVisibility(nextVisibility('on'))),'on');
 for(const f of ['body','hip','knee'])for(const [name,state] of focusStates(f))assert.equal(state,relevant(name,f)?'on':'off');
 assert.equal(focusStates('hip').get('Vastus medialis muscle.r'),'off');
 assert.equal(focusStates('knee').get('Rectus femoris muscle.r'),'on');
 assert.equal(focusStates('hip').get('Rectus femoris muscle.r'),'on');
});
test('all catalog names exist in actual GLBs', {skip:!existsSync('.cache/muscular.glb')},()=>{
 const names=new Set();for(const sys of ['muscular','joints']){const b=readFileSync('.cache/'+sys+'.glb');const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));for(const n of j.nodes)names.add(n.extras?.za_name);}
 for(const [name] of tissues)assert.ok(names.has(name),name);
 const b=readFileSync('.cache/skeletal.glb');const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
 for(const n of j.nodes)if(n.extras?.za_name)assert.ok(japaneseName(n.extras.za_name),n.extras.za_name);
});
