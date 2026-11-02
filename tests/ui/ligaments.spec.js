import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
test('five ligament meshes retain bone attachment collars through all knee motions',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/?review=ligaments&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 const names=await page.evaluate(()=>window.atlasLigamentQA().entries.map(e=>e.name));expect(names).toHaveLength(5);
 await expect(page.locator('#ligamentList')).toBeVisible();await expect(page.locator('#muscleList')).toBeHidden();
 const audit=[];
 for(const [kind,values] of [['flex',[0,20,60,90,120]],['rot',[-15,0,30]],['stress',[-3,0,3]]]){
  await page.locator('[data-motion="'+kind+'"]').click();
  for(const angle of values){
   await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(angle));
   await expect.poll(async()=>{const a=(await page.evaluate(()=>window.atlasQA())).renderedAngles;return Math.abs(a[kind==='flex'?'flex':kind==='rot'?'rot':'valgus']-angle);}).toBeLessThan(.001);
   const result=await page.evaluate(()=>{
    const qa=window.atlasLigamentQA();return {entries:qa.entries,residuals:qa.bindings.map(b=>{
     const vertices=window.atlasMeshQA(b.name)[0].positions;
     const error=collar=>Math.max(...collar.map(({index,expected})=>Math.hypot(...vertices[index].map((v,i)=>v-expected[i]))));
     return {name:b.name,proximal:error(b.proximal),distal:error(b.distal),finite:vertices.flat().every(Number.isFinite)};
    })};
   });
   for(const r of result.residuals){expect(r.proximal).toBeLessThan(1e-5);expect(r.distal).toBeLessThan(1e-5);expect(r.finite).toBeTruthy();}
   expect(result.entries.find(e=>e.name.startsWith('Fibular')).distalBone).toBe('Fibula.r');
   audit.push({kind,angle,...result});
  }
 }
 const row=page.locator('[data-tissue="Anterior cruciate ligament.r"]');await row.click();await expect(row).toHaveAttribute('data-state','fade');await row.click();await expect(row).toHaveAttribute('data-state','off');
 await page.locator('[data-mode="anatomy"]').click();await expect(row).toHaveAttribute('data-state','off');await page.locator('[data-mode="kinesiology"]').click();await expect(row).toHaveAttribute('data-state','off');await row.click();
 await page.locator('[data-motion="flex"]').click();await page.locator('#motionSlider').evaluate(el=>{el.value=90;el.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect.poll(async()=>Math.abs((await page.evaluate(()=>window.atlasQA())).renderedAngles.flex-90)).toBeLessThan(.001);
 while((await page.evaluate(()=>window.atlasQA())).patellaState!=='off')await page.locator('#patellaVisibility').click();await page.locator('[data-view="iso"]').click();
 await page.screenshot({path:'test-results/ligaments-90.png'});
 await page.setViewportSize({width:1280,height:800});expect(await page.locator('#sidebar').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
 await page.mouse.move(1000,500);await page.mouse.wheel(0,-700);
 await page.evaluate(()=>new Promise(resolve=>{let n=0;const step=()=>++n===30?resolve():requestAnimationFrame(step);requestAnimationFrame(step);}));
 for(const angle of [0,30,90,120]){
  await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(angle));
  await expect.poll(async()=>Math.abs((await page.evaluate(()=>window.atlasQA())).renderedAngles.flex-angle)).toBeLessThan(.001);
  for(const view of ['lateral','medial']){await page.locator('[data-view="'+view+'"]').click();await page.screenshot({path:'test-results/ligaments-'+view+'-'+angle+'.png'});}
 }
 writeFileSync('test-results/ligament-attachments.json',JSON.stringify(audit,null,2));expect(errors).toEqual([]);
});
