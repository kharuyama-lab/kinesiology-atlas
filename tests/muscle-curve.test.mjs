import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Quaternion} from 'three';
import {MuscleCurve} from '../src/muscle-curve.js';
test('source skinning retains the original curved course and cross sections; attachment centres track bones',()=>{
 const world=[];for(let ring=0;ring<=40;ring++){const t=ring/40;for(let j=0;j<16;j++){const a=j*Math.PI/8;world.push(.1*Math.sin(Math.PI*t)+.02*Math.cos(a),1-t,.06*Math.sin(2*Math.PI*t)+.02*Math.sin(a));}}
 const c=new MuscleCurve([{name:'Long head of biceps femoris.r',world:new Float64Array(world)}]),q=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-.9),body={rotation:q,point:p=>p.applyQuaternion(q)},fixed={rotation:new Quaternion(),point:p=>p},distal={rotation:q,point:p=>p.applyQuaternion(q).add(new Vector3(.05,.1,-.1))};c.pose({proximal:fixed,distal,body});assert.ok(c.determinant>0);
 assert.ok(c.deform(c.a,new Vector3()).distanceTo(c.start)<1e-7);assert.ok(c.deform(c.b,new Vector3()).distanceTo(c.end)<1e-7);
 for(let ring=0;ring<=40;ring++){const t=ring/40;for(let j=0;j<16;j++){const p=new Vector3().fromArray(world,(ring*16+j)*3),originalResidual=p.clone().sub(c.a.clone().lerp(c.b,t)).applyQuaternion(q),posedResidual=c.deform(p,new Vector3()).sub(c.start.clone().lerp(c.end,t));assert.ok(posedResidual.distanceTo(originalResidual)<1e-7,'source curvature must survive at '+ring);}}
 const p=new Vector3().fromArray(world,16*20*3),p2=new Vector3().fromArray(world,(16*20+8)*3);assert.ok(Math.abs(c.deform(p,new Vector3()).distanceTo(c.deform(p2,new Vector3()))-p.distanceTo(p2))<1e-7,'no fake cross-section scaling');
});

test('rectus retains its source course on the femoral shaft between attachment transitions',()=>{
 const world=[];for(let i=0;i<=40;i++){const t=i/40;for(let j=0;j<12;j++)world.push(.06*Math.sin(Math.PI*t)+.02*Math.cos(j*Math.PI/6),1-t,.03*Math.sin(j*Math.PI/6));}
 for(const name of ['Rectus femoris muscle.r','Sartorius muscle.r']){const c=new MuscleCurve([{name,world:new Float64Array(world)}]),q=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-Math.PI/2),body={rotation:q,point:p=>p.sub(new Vector3(0,1,0)).applyQuaternion(q).add(new Vector3(0,1,0))},fixed={rotation:new Quaternion(),point:p=>p},distal={rotation:q,point:p=>body.point(p).add(new Vector3(.05,0,.1))};c.pose({proximal:fixed,distal,body});for(const i of [18,20,24]){const p=new Vector3().fromArray(world,i*12*3);assert.ok(c.deform(p,new Vector3()).distanceTo(body.point(p.clone()))<.0001,name+' must retain its femoral surface course');}assert.ok(c.determinant>0);}
});

test('quadriceps source path passes the patellar frame and terminates on the tibial frame',()=>{const world=[];for(let i=0;i<=40;i++)for(let j=0;j<16;j++)world.push(.02*Math.cos(j*Math.PI/8),1-i/40,.02*Math.sin(j*Math.PI/8));const c=new MuscleCurve([{name:'Rectus femoris muscle.r',world:new Float64Array(world)}]),q=new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-Math.PI/2),body={rotation:q,point:p=>p.sub(new Vector3(0,1,0)).applyQuaternion(q).add(new Vector3(0,1,0))},fixed={rotation:new Quaternion(),point:p=>p},distal={rotation:q,point:p=>body.point(p).add(new Vector3(.01,.02,.04))},via={rotation:q,y:.18,point:p=>body.point(p).add(new Vector3(.02,.03,.02))};c.pose({proximal:fixed,body,distal,via});const source=c.source(c.viaT);assert.ok(c.deform(source,new Vector3()).distanceTo(via.point(source.clone()))<.0002);assert.ok(c.deform(c.b,new Vector3()).distanceTo(distal.point(c.b.clone()))<1e-7);assert.ok(c.determinant>0);});
