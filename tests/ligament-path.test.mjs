import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {ligamentPath} from '../src/ligament-path.js';
test('shorter attachment separation creates slack without lengthening the material route',()=>{
 const a=new Vector3(),normal=new Vector3(1,0,0);
 for(const separation of [1,.95,.88,.8]){
  const b=new Vector3(0,separation,0),route=ligamentPath(a,b,1,normal);
  assert.ok(Math.abs(route.length-1)<1e-8);assert.ok(route.point(0).distanceTo(a)<1e-12);assert.ok(route.point(1).distanceTo(b)<1e-12);
  assert.ok(separation===1?route.amplitude===0:route.amplitude>0);
 }
 const stretched=ligamentPath(a,new Vector3(0,1.05,0),1,normal);assert.ok(Math.abs(stretched.length-1.05)<1e-10);assert.equal(stretched.amplitude,0);
});
