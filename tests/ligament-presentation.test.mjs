import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ligamentEngagement,ligamentAppearance} from '../src/ligament-presentation.js';
test('teaching rotation and collateral stress cues remain directional and bounded',()=>{
 assert.deepEqual(ligamentEngagement({rot:-15}),{acl:1,pcl:1,mcl:0,lcl:0});
 const er=ligamentEngagement({rot:30});assert.equal(er.acl,0);assert.equal(er.mcl,1);assert.equal(er.lcl,1);
 const ext=ligamentEngagement({flex:0});for(const key of ['acl','mcl','lcl'])assert.equal(ext[key],1);assert.equal(ext.pcl,0);assert.equal(ligamentEngagement({flex:120}).pcl,1);
 assert.equal(ligamentEngagement({valgus:3}).mcl,1);assert.equal(ligamentEngagement({valgus:-3}).lcl,1);
 assert.deepEqual(ligamentEngagement({rot:300}),ligamentEngagement({rot:30}));
});
test('maximum cue pulses without changing explicit Fade opacity',()=>{
 const a=ligamentAppearance(1,0),b=ligamentAppearance(1,Math.PI/2/.004);
 assert.ok(b.glow>a.glow);assert.equal(a.maximum,true);assert.equal(a.opacity,1);
 assert.equal(ligamentAppearance(1,0,'fade').opacity,.3);assert.ok(ligamentAppearance(0,0).paleness>a.paleness);
});
