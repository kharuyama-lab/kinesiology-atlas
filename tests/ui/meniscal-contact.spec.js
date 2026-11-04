import {test,expect} from '@playwright/test';import {writeFileSync} from 'node:fs';
import {Vector3,Quaternion} from 'three';import {surfaceHeight} from '../../src/surface-geometry.js';
test('Patella cycles in panel and floating selection and retains state across modes',async({page})=>{
 await page.goto('http://127.0.0.1:8080/?review=knee&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');const snap=()=>page.evaluate(()=>window.atlasQA()),button=page.locator('#patellaVisibility');
 expect((await snap()).bones.find(b=>b.name==='Patella.r').opacity).toBeCloseTo(.3);
 await page.screenshot({path:'test-results/patella-display-panel.png'});
 await button.click();expect((await snap()).bones.find(b=>b.name==='Patella.r').visible).toBeFalsy();
 await page.locator('[data-mode="anatomy"]').click();expect((await snap()).patellaState).toBe('off');await page.locator('[data-mode="kinesiology"]').click();expect((await snap()).patellaState).toBe('off');
 await button.click();await page.locator('[data-focus="knee"]').click();await page.locator('[data-view="lateral"]').click();
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const s=await snap(),box=await page.locator('#canvasHost').boundingBox();await page.mouse.click(box.x+(s.patellaNDC[0]+1)*box.width/2,box.y+(1-s.patellaNDC[1])*box.height/2);
 await expect(page.locator('#floatingSelection')).toContainText('膝蓋骨');await page.locator('#floatingSelection button').click();await expect(button).toHaveAttribute('data-state','fade');await page.locator('#floatingSelection button').click();await expect(button).toHaveAttribute('data-state','off');
 await button.click();await page.locator('[data-focus="body"]').click();expect((await snap()).patellaState).toBe('fade');
});
test('load-bearing centres follow contacts through rotation and stress with rooted compression',async({page})=>{
 await page.goto('http://127.0.0.1:8080/?review=knee&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');const reports=[];
 for(const [kind,angles] of [['flex',[0,30,90,120]],['rot',[-15,0,30]],['stress',[-3,0,3]]]){
  await page.locator('[data-motion="'+kind+'"]').click();
  for(const angle of angles){await page.locator('#motionSlider').evaluate((el,x)=>{el.value=x;el.dispatchEvent(new Event('input',{bubbles:true}));},String(angle));await page.locator('[data-focus="knee"]').click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const s=await page.evaluate(()=>window.atlasQA());
   for(const m of s.menisci){expect(m.contactResidual).toBeLessThan(.0005);expect(m.compression).toBeGreaterThanOrEqual(0);expect(m.compression).toBeLessThanOrEqual(.2);}
   const actual=await page.evaluate(()=>({support:window.atlasMeniscusSupportQA(),meshes:Object.fromEntries(['Medial meniscus.r','Lateral meniscus.r'].map(n=>[n,window.atlasMeshQA(n)[0].positions]))}));
   const hip=new Vector3(...s.calibration.hipCenter),h=new Quaternion(...s.hip).invert(),q=new Quaternion(...s.knee).invert(),k=new Vector3(...s.calibration.kneeCenter),d=new Vector3(...s.kneeTranslation);
   for(const entry of actual.support.entries){const points=actual.meshes[entry.name].map(p=>new Vector3(...p).sub(hip).applyQuaternion(h).add(hip).sub(k).sub(d).applyQuaternion(q)),centre=points.reduce((sum,p,i)=>sum.addScaledVector(p,entry.loadWeights[i]),new Vector3()),meta=s.menisci.find(m=>m.name===entry.name);expect(Math.hypot(centre.x-meta.contactTarget[0],centre.z-meta.contactTarget[2])).toBeLessThan(.0005);for(const root of meta.roots)expect(Math.min(...points.map(p=>p.distanceTo(new Vector3(...root))))).toBeLessThan(.000002);const reduction=points.map((p,i)=>surfaceHeight(actual.support.surface,p.x,p.z).height+entry.offsets[i]-p.y);if(meta.compression>.01)expect(Math.max(...reduction)).toBeGreaterThan(.0001);else expect(Math.max(...reduction.map(Math.abs))).toBeLessThan(.000002);}
   if(kind==='stress'&&angle){const closed=s.menisci.find(m=>m.name.startsWith(angle<0?'Medial':'Lateral')),opened=s.menisci.find(m=>m!==closed);expect(closed.compression).toBeGreaterThan(.01);expect(opened.compression).toBe(0);}
   reports.push({kind,angle,menisci:s.menisci});if(kind!=='flex'){await page.locator('[data-view="iso"]').click();await page.locator('#patellaVisibility').click();await page.locator('#viewport').screenshot({path:`test-results/meniscal-${kind}-${angle}.png`});while((await page.evaluate(()=>window.atlasQA())).patellaState!=='on')await page.locator('#patellaVisibility').click();}
  }
 }
 const rotations=reports.filter(r=>r.kind==='rot');for(let i=0;i<2;i++)expect(Math.abs(rotations[0].menisci[i].supportCentre[2]-rotations[2].menisci[i].supportCentre[2])).toBeGreaterThan(.002);
 writeFileSync('test-results/meniscal-contact-review.json',JSON.stringify({status:'GEOMETRIC CONTACT CENTRE — COMPRESSION NOT FORCE/STRAIN',reports},null,2));
});
