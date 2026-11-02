import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
test('extension reference remains longer than flexed attachment separation without growing the route',async({page})=>{
 await page.goto('http://127.0.0.1:8080/?review=ligaments&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 await page.locator('#boneVisibility').click();await page.locator('#axisVisibility').click();await page.locator('#patellaVisibility').click();await page.locator('#patellaVisibility').click();
 await page.locator('[data-view="medial"]').click();await page.mouse.move(1000,500);await page.mouse.wheel(0,-700);
 const report=[];
 for(const angle of [0,30,60,90,120]){
  await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(angle));await page.locator('[data-focus="knee"]').click();
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const entries=await page.evaluate(()=>window.atlasLigamentQA().entries);report.push({angle,entries});
  for(const e of entries.filter(e=>!e.name.startsWith('Posterior'))){expect(e.span).toBeLessThanOrEqual(e.referenceLength*1.001);expect(Math.abs(e.routeLength-e.referenceLength)).toBeLessThan(1e-8);if(angle===90)expect(e.spanRatio).toBeLessThan(.99);}
  for(const e of entries.filter(e=>e.name.includes('tibial collateral')))expect(e.attachmentShift).toBeLessThan(.006);
  await page.locator('[data-view="medial"]').click();
  if([0,90,120].includes(angle))await page.screenshot({path:'test-results/consistent-path-'+angle+'.png'});
 }
 writeFileSync('test-results/ligament-path-consistency.json',JSON.stringify({status:'Representative route consistency; not final anatomical validation',report},null,2));
});
