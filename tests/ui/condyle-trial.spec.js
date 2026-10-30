import {test,expect} from '@playwright/test';import {writeFileSync} from 'node:fs';
test('isolated axis and patella trials; baseline remains unchanged',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const reports=[];
 for(const [key,query] of [['current',''],['condyle','&axis=condyle'],['patella-arc','&axis=condyle&patella=arc']]){
  await page.goto('http://127.0.0.1:8080/?review=knee&qa'+query);await expect(page.locator('#modelStatus')).toHaveText('Ready');
  await page.locator('[data-mode="anatomy"]').click();await page.locator('[data-focus="knee"]').click();
  const rest=await page.evaluate(()=>window.atlasQA());expect(Math.hypot(...rest.patellaRotation.slice(0,3))).toBeLessThan(1e-12);expect(rest.patellaRotation[3]).toBeCloseTo(1,12);
  if(key==='current'){expect(rest.activeFlexAxis).toEqual([1,0,0]);expect(rest.axisTrial).toBeFalsy();}
  else{expect(rest.axisTrial).toBeTruthy();expect(rest.condyleReview.medial.count).toBeGreaterThan(20);expect(rest.condyleReview.lateral.count).toBeGreaterThan(20);expect(Math.hypot(...rest.activeFlexAxis)).toBeCloseTo(1,8);}
  await page.locator('[data-mode="kinesiology"]').click();
  for(const angle of [0,30,60,90,120]){
   await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(angle));
   // Intentional Focus operation applies the complete pose for a static comparison.
   await page.locator('[data-focus="knee"]').click();await page.locator('[data-view="lateral"]').click();
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const state=await page.evaluate(()=>window.atlasQA());reports.push({variant:key,angle,center:state.calibration.kneeCenter,axis:state.activeFlexAxis,patellaCenter:state.patellaCenter,patellaRotation:state.patellaRotation,fit:angle===0?state.condyleReview:undefined});
   if(angle===90&&key==='patella-arc')expect(Math.abs(state.patellaRotation[0])).toBeGreaterThan(.45);
   await page.locator('#viewport').screenshot({path:`test-results/${key}-${angle}.png`});
  }
  await page.locator('[data-mode="anatomy"]').click();await page.locator('[data-focus="knee"]').click();const neutral=(await page.evaluate(()=>window.atlasQA())).patellaRotation;expect(Math.hypot(...neutral.slice(0,3))).toBeLessThan(1e-12);expect(neutral[3]).toBeCloseTo(1,12);
 }
 writeFileSync('test-results/condyle-patella-trial.json',JSON.stringify({status:'EXPERIMENTAL — NOT FIXED',patellaArcFraction:.7,note:'0.7 is an explicit trial assumption; arc-only model rejected after visual review for persistent separation; no trochlear surface contact, tilt or spin model',reports},null,2));expect(errors).toEqual([]);
});
