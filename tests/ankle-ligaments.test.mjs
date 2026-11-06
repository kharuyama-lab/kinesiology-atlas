import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Group,Mesh,BufferGeometry,Float32BufferAttribute,MeshBasicMaterial,Vector3,BoxGeometry} from 'three';
import {AnkleLigamentFollower} from '../src/ankle-ligament-follow.js';
import {BoneSurface} from '../src/bone-surface.js';

for(const [name,distal] of [['Posterior tibiotalar ligament.r','Talus.r'],['Anterior tibiofibular ligament.r','Fibula.r']])test(`${name}: both ends contact bone surfaces despite initial gaps and remain attached during motion`,()=>{
 const scene=new Scene(),aBone=new Group(),bBone=new Group(),source=new Group();scene.add(aBone,bBone,source);bBone.position.set(.02,0,0);
 const makeMesh=points=>new Mesh(new BufferGeometry().setAttribute('position',new Float32BufferAttribute(points,3)),new MeshBasicMaterial());
 const a=makeMesh([0,-.002,0,0,.002,0,0,0,.002]),b=makeMesh([0,-.002,0,0,.002,0,0,0,.002]);aBone.add(a);bBone.add(b);
 const points=[];for(let i=0;i<=10;i++)for(const [y,z] of [[-.001,0],[.001,0],[0,.001]])points.push(.003+i*.0014,y,z);const mesh=makeMesh(points);source.add(mesh);scene.updateMatrixWorld(true);
 aBone.userData.za_name='Tibia.r';bBone.userData.za_name=distal;
 const geometry=mesh.geometry,original=Array.from(geometry.attributes.position.array),registered=new Map([['Tibia.r',aBone],[distal,bBone]]),getMeshes=n=>n==='Tibia.r'?[a]:n===distal?[b]:n===name?[mesh]:[];
 const follower=new AnkleLigamentFollower();follower.prepare({registered,getMeshes});assert.equal(follower.entries.length,1);assert.notEqual(mesh.geometry,geometry);
 assert.ok(follower.snapshot()[0].sourceGaps.every(g=>g>.002),'fixture starts with detached source endpoints');
 for(let i=0;i<5;i++){aBone.position.set(.01,.004,-.002);aBone.quaternion.setFromAxisAngle(new Vector3(0,1,0),.2);bBone.position.set(.025,.005,.003);bBone.quaternion.setFromAxisAngle(new Vector3(0,0,1),-.4);follower.update();for(const e of follower.audit()){assert.ok(e.finite);assert.equal(e.middleAnchors,0);assert.ok(e.maxAnchorError<1e-8);assert.ok(e.maxSurfaceGap<1e-8);assert.ok(e.byBone[distal]<1e-8);assert.ok(e.byBone['Tibia.r']<1e-8);}aBone.position.set(0,0,0);aBone.quaternion.identity();bBone.position.set(.02,0,0);bBone.quaternion.identity();follower.update();assert.ok(follower.audit()[0].maxRestError<1e-8);}
 assert.deepEqual(Array.from(geometry.attributes.position.array),original,'shared source geometry is not deformed');
});

test('free ligament body is excluded from an intervening bone while only terminal footprints are fixed',()=>{
 const scene=new Scene(),aBone=new Group(),bBone=new Group(),obstacle=new Group(),source=new Group();scene.add(aBone,bBone,obstacle,source);bBone.position.x=.02;obstacle.position.x=.01;
 const make=p=>new Mesh(new BufferGeometry().setAttribute('position',new Float32BufferAttribute(p,3)),new MeshBasicMaterial()),a=make([0,-.002,0,0,.002,0,0,0,.002]),b=make([0,-.002,0,0,.002,0,0,0,.002]),box=new Mesh(new BoxGeometry(.006,.004,.004),new MeshBasicMaterial());aBone.add(a);bBone.add(b);obstacle.add(box);
 const p=[];for(let i=0;i<=20;i++)for(const y of [-.0006,.0006])p.push(.002+i*.0008,y,0);const geometry=new BufferGeometry().setAttribute('position',new Float32BufferAttribute(p,3)),ids=[];for(let i=0;i<20;i++)ids.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);geometry.setIndex(ids);const mesh=new Mesh(geometry,new MeshBasicMaterial());source.add(mesh);scene.updateMatrixWorld(true);
 const registered=new Map([['Tibia.r',aBone],['Talus.r',bBone],['Calcaneus.r',obstacle]]),getMeshes=n=>n==='Tibia.r'?[a]:n==='Talus.r'?[b]:n==='Calcaneus.r'?[box]:n==='Posterior tibiotalar ligament.r'?[mesh]:[],follower=new AnkleLigamentFollower();follower.prepare({registered,getMeshes});
 const audit=follower.audit()[0];assert.equal(audit.middleAnchors,0);assert.ok(audit.maxAnchorError<1e-8);assert.ok(audit.maxPenetration<.00005);assert.ok(audit.maxFacePenetration<.00005);
 const collider=new BoneSurface(obstacle,[box]);assert.ok(collider.signedDistance(new Vector3(.01,0,0))<0);for(const [i,pos] of follower.entries[0].positions.entries())if(!follower.entries[0].anchors.has(i))assert.ok(collider.signedDistance(pos)>-.00005);
});
