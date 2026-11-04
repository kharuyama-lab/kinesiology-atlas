import {test} from 'node:test';import assert from 'node:assert/strict';
import {advancePlayback} from '../src/playback.js';
test('auto oscillation reflects without losing overshoot and stays within all ranges',()=>{
 assert.deepEqual(advancePlayback(139,1,.1,0,140,42),{value:136.8,direction:-1});
 assert.equal(advancePlayback(0,1,100,0,140,42).value,0);
 for(const [min,max,speed] of [[0,140,42],[-15,30,15],[-3,3,1.5]]){let state={value:max,direction:1};let forward=false,reverse=false;for(let i=0;i<1000;i++){state=advancePlayback(state.value,state.direction,.05,min,max,speed);assert.ok(state.value>=min&&state.value<=max);forward||=state.direction===1;reverse||=state.direction===-1;}assert.ok(forward&&reverse);}
});
