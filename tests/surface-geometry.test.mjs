import {test} from 'node:test';import assert from 'node:assert/strict';import {Vector3,Triangle} from 'three';
import {upperSurface,surfaceHeight,radialSurface} from '../src/surface-geometry.js';
test('tibial support retains a known slope and reports footprint distance',()=>{
 const p=(x,z)=>new Vector3(x,.01+.1*x+.2*z,z),a=p(-.03,-.03),b=p(.03,-.03),c=p(.03,.03),d=p(-.03,.03),surface=upperSurface([new Triangle(a,b,c),new Triangle(a,c,d)]);
 assert.ok(Math.abs(surfaceHeight(surface,.005,.008).height-(.01+.1*.005+.2*.008))<1e-12);
 assert.ok(surfaceHeight(surface,.05,0).distance>.019);assert.ok(surfaceHeight(surface,0,0).distance<1e-12);
});
test('surface ray follows the actual triangle instead of a circular pivot',()=>{
 const a=new Vector3(-1,-1,.03),b=new Vector3(1,-1,.03),c=new Vector3(0,1,.03),triangles=[new Triangle(a,b,c)];
 const hit=radialSurface(triangles,new Vector3(),new Vector3(0,0,1));assert.ok(hit.distanceTo(new Vector3(0,0,.03))<1e-12);
 assert.equal(radialSurface(triangles,new Vector3(2,0,0),new Vector3(0,0,1)),null);
});
