import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Quaternion} from 'three';
import {MuscleCurve} from '../src/muscle-curve.js';
test('continuous muscle cage preserves both caps, has no reversing centreline and changes the whole belly',()=>{
 const world=[];for(let ring=0;ring<=40;ring++){const t=ring/40,r=.006+.025*Math.sin(Math.PI*t);for(let j=0;j<16;j++){const a=j*Math.PI/8;world.push(r*Math.cos(a),1-t,r*Math.sin(a));}}
 const c=new MuscleCurve([{name:'test',world:new Float64Array(world)}]),fixed={rotation:new Quaternion(),point:p=>p},q=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),Math.PI/2),origin=new Vector3(0,0,0),endShift=new Vector3(.1,.25,0),distal={rotation:q,point:p=>p.sub(origin).applyQuaternion(q).add(origin).add(endShift)};
 c.pose({proximal:fixed,distal});const out=new Vector3(),chord=c.end.clone().sub(c.start).normalize();for(let i=1;i<c.samples.length;i++)assert.ok(c.samples[i].center.clone().sub(c.samples[i-1].center).dot(chord)>0);
 for(const i of [0,40*16]){const p=new Vector3().fromArray(world,i*3),expected=(i===0?fixed:distal).point(p.clone());assert.ok(c.deform(p,out).distanceTo(expected)<1e-7);}
 for(const ring of [8,16,24,32]){const p=new Vector3().fromArray(world,ring*16*3);assert.ok(c.deform(p,out).distanceTo(p)>.01,'whole-length deformation at '+ring);}
 assert.ok(c.radialScale>=.85&&c.radialScale<=1.18);
});
