import {test,expect} from '@playwright/test';import {writeFileSync} from 'node:fs';
import {Vector3,Quaternion,Triangle} from 'three';import {upperSurface,surfaceHeight} from '../../src/surface-geometry.js';
import {meshVolumeProbe} from '../mesh-volume.mjs';
test('tibial surface-following menisci and distal trochlear patellar tracking',async({page})=>{
 await page.goto('http://127.0.0.1:8080/?review=knee&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 await page.locator('[data-mode="anatomy"]').click();await page.locator('[data-focus="knee"]').click();
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const rest=await page.evaluate(()=>({state:window.atlasQA(),tibia:window.atlasMeshQA('Tibia.r'),femur:window.atlasMeshQA('Femur.r'),patella:window.atlasMeshQA('Patella.r'),menisci:Object.fromEntries(['Medial meniscus.r','Lateral meniscus.r'].map(n=>[n,window.atlasMeshQA(n)[0]]))}));
 writeFileSync('.cache/support-debug.json',JSON.stringify({rest,support:await page.evaluate(()=>window.atlasMeniscusSupportQA())}));
 const k=new Vector3(...rest.state.calibration.kneeCenter),triangles=[];for(const mesh of rest.tibia){const v=mesh.positions.map(p=>new Vector3(...p).sub(k));for(let i=0;i<mesh.indices.length;i+=3)triangles.push(new Triangle(...mesh.indices.slice(i,i+3).map(j=>v[j])));}const surface=upperSurface(triangles),reports=[];
 const femur={positions:[],indices:[]};for(const mesh of rest.femur){const count=femur.positions.length;femur.positions.push(...mesh.positions);femur.indices.push(...mesh.indices.map(i=>i+count));}const probe=meshVolumeProbe(femur),fv=femur.positions.map(p=>new Vector3(...p)),femoralTriangles=[];for(let i=0;i<femur.indices.length;i+=3)femoralTriangles.push(new Triangle(...femur.indices.slice(i,i+3).map(j=>fv[j])));
 await page.locator('[data-mode="kinesiology"]').click();
 for(const angle of [0,20,30,45,60,75,90,120,90,0]){
  await page.locator('#motionSlider').evaluate((el,x)=>{el.value=x;el.dispatchEvent(new Event('input',{bubbles:true}));},String(angle));await page.locator('[data-focus="knee"]').click();await page.locator('[data-view="medial"]').click();
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const data=await page.evaluate(()=>({state:window.atlasQA(),patella:window.atlasTrackingQA(),patellaMeshes:window.atlasMeshQA('Patella.r'),menisci:Object.fromEntries(['Medial meniscus.r','Lateral meniscus.r'].map(n=>[n,window.atlasMeshQA(n)[0].positions]))})),s=data.state;
  const hip=new Vector3(...s.calibration.hipCenter),h=new Quaternion(...s.hip).invert(),q=new Quaternion(...s.knee).invert(),d=new Vector3(...s.kneeTranslation);let maxError=0,frozenError=0;
  for(const [name,positions] of Object.entries(data.menisci))positions.forEach((p,i)=>{const local=new Vector3(...p).sub(hip).applyQuaternion(h).add(hip).sub(k).sub(d).applyQuaternion(q),original=new Vector3(...rest.menisci[name].positions[i]).sub(k),offset=original.y-surfaceHeight(surface,original.x,original.z).height,expected=surfaceHeight(surface,local.x,local.z).height+offset;maxError=Math.max(maxError,Math.abs(local.y-expected));frozenError=Math.max(frozenError,Math.abs(original.y-expected));});
  expect(maxError).toBeLessThan(.0005);if(angle>=60){expect(frozenError).toBeGreaterThan(.0002);expect(Math.max(...s.menisci.map(e=>e.maxHeightChange))).toBeGreaterThan(.0002);}
  if(angle===90){expect(data.patella.center[1]).toBeLessThan(rest.state.patellaCenter[1]-k.y-.02);expect(data.patella.minimumRayGap).toBeGreaterThan(.0005);}
  let patellaAudit=null;if([0,30,60,90,120].includes(angle)){let nearest=Infinity,inside=0;for(const p0 of data.patellaMeshes.flatMap(m=>m.positions)){const p=new Vector3(...p0).sub(hip).applyQuaternion(h).add(hip);for(const t of femoralTriangles)nearest=Math.min(nearest,t.closestPointToPoint(p,new Vector3()).distanceTo(p));if(probe(p).inside)inside++;}expect(inside).toBe(0);expect(nearest).toBeLessThan(.006);patellaAudit={insideVertices:inside,nearestVertexDistance:nearest};}
  reports.push({angle,maxSurfaceOffsetError:maxError,flatHeightNegativeControl:frozenError,tracking:data.patella,patellaAudit,menisci:s.menisci});
  await page.locator('#viewport').screenshot({path:`test-results/surface-medial-${angle}.png`});if([30,60,90,120].includes(angle)){await page.locator('[data-view="lateral"]').click();await page.locator('#viewport').screenshot({path:`test-results/surface-lateral-${angle}.png`});await page.locator('[data-view="iso"]').click();await page.locator('#viewport').screenshot({path:`test-results/surface-3d-${angle}.png`});}
  if(angle===90){const box=await page.locator('#viewport').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);for(let i=0;i<12;i++)await page.mouse.wheel(0,-100);await page.mouse.move(box.x+20,box.y+100);await page.locator('#viewport').screenshot({path:'test-results/surface-closeup-90.png'});}
 }
 writeFileSync('test-results/surface-tracking-review.json',JSON.stringify({status:'GEOMETRIC TRACKING — NOT ANATOMICAL APPROVAL',reports},null,2));
});
