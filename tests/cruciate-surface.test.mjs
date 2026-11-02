import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Matrix4} from 'three';
import {createCruciateSurface} from '../src/cruciate-surface.js';
test('smooth cruciate surface has straight extension, fixed attachment frames and preserved section areas',()=>{
 const points=[];for(let i=0;i<=10;i++)for(let j=0;j<20;j++){const t=i/10,a=j*Math.PI/10,r=.04+.04*Math.abs(2*t-1);points.push(new Vector3(r*Math.cos(a),t,r*.4*Math.sin(a)));}
 const surface=createCruciateSurface(points,new Vector3(),new Vector3(0,1,0)),a=surface.geometry.attributes.position;
 const ring=i=>Array.from({length:20},(_,j)=>new Vector3().fromBufferAttribute(a,i*20+j));
 const area=points=>{const sum=new Vector3();points.forEach((p,i)=>sum.add(new Vector3().crossVectors(p,points[(i+1)%points.length])));return sum.length()/2;};
 surface.update(new Matrix4(),new Matrix4());
 const original=Array.from({length:33},(_,i)=>ring(i)),areas=original.map(area);
 for(let i=0;i<33;i++){const c=original[i].reduce((v,p)=>v.add(p),new Vector3()).multiplyScalar(1/20);assert.ok(c.distanceTo(new Vector3(0,i/32,0))<1e-6);assert.ok(areas[i]>0);}
 let volume=0;const indices=surface.geometry.index.array;for(let i=0;i<indices.length;i+=3){const p=new Vector3().fromBufferAttribute(a,indices[i]),q=new Vector3().fromBufferAttribute(a,indices[i+1]),r=new Vector3().fromBufferAttribute(a,indices[i+2]);volume+=p.dot(q.cross(r))/6;}assert.ok(volume>0);
 const delta=new Matrix4().makeRotationX(Math.PI/2);delta.setPosition(.2,-.1,.3);surface.update(delta,new Matrix4());
 for(let i=0;i<20;i++){assert.ok(ring(0)[i].distanceTo(original[0][i])<1e-6);assert.ok(ring(32)[i].distanceTo(original[32][i].clone().applyMatrix4(delta))<1e-6);}
 for(let i=0;i<33;i++)assert.ok(Math.abs(area(ring(i))/areas[i]-1)<1e-4);
 assert.ok(Array.from(a.array).every(Number.isFinite));
});
