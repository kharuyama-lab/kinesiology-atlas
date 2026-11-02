import {test} from 'node:test';import assert from 'node:assert/strict';import {Vector3,Quaternion} from 'three';
import {profileSupport,contactTranslation} from '../src/knee-contact.js';
test('ellipse contact and curvature agree with independent endpoint geometry',()=>{
 const model={a:[1,0,0],u:[0,1,0],v:[0,0,1]},p={x:.02,ellipse:{center:[.01,.03],rY:.02,rZ:.03}};
 const distal=profileSupport(model,p,new Vector3(0,1,0)),posterior=profileSupport(model,p,new Vector3(0,0,1));
 assert.ok(distal.point.distanceTo(new Vector3(.02,-.01,.03))<1e-12);assert.ok(Math.abs(distal.radius-.045)<1e-12);
 assert.ok(posterior.point.distanceTo(new Vector3(.02,.01,0))<1e-12);assert.ok(Math.abs(posterior.radius-.02*.02/.03)<1e-12);
});
test('contact reference preserves extension exactly and reverses without history',()=>{
 const model={a:[1,0,0],u:[0,1,0],v:[0,0,1],profiles:[-.02,.02].map(x=>({x,kind:x<0?'lateral':'medial',ellipse:{center:[0,0],rY:.02,rZ:.025},posteriorTravel:.003}))};
 for(const p of model.profiles)p.reference=profileSupport(model,p,new Vector3(0,1,0)).point.toArray();
 assert.ok(contactTranslation(model,new Quaternion(),0).translation.length()<1e-14);
 const pose=angle=>contactTranslation(model,new Quaternion().setFromAxisAngle(new Vector3(1,0,0),angle*Math.PI/180),angle);
 const a=pose(60);pose(120);assert.ok(a.translation.distanceTo(pose(60).translation)<1e-14);
 assert.ok(pose(0).translation.length()<1e-14);
});
