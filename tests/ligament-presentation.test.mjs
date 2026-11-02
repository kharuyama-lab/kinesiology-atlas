import {test} from 'node:test';import assert from 'node:assert/strict';
import {ligamentEngagement,ligamentAppearance} from '../src/ligament-presentation.js';
test('only extension engages the retained qualitative cue',()=>{
 assert.deepEqual(ligamentEngagement({flex:0}),{acl:1,pcl:0,mcl:1,lcl:1});
 for(const rot of [-15,0,30])assert.deepEqual(ligamentEngagement({flex:90,rot,valgus:3}),{acl:0,pcl:0,mcl:0,lcl:0});
 assert.ok(ligamentEngagement({flex:15}).acl>0);assert.equal(ligamentEngagement({flex:30}).acl,0);
});
test('pulse respects explicit ON and Fade opacity',()=>{
 assert.equal(ligamentAppearance(0,0).opacity,1);assert.equal(ligamentAppearance(1,0).opacity,1);assert.equal(ligamentAppearance(1,0,'fade').opacity,.3);
 assert.ok(ligamentAppearance(1,Math.PI/2/.004).glow>ligamentAppearance(1,0).glow);
});
