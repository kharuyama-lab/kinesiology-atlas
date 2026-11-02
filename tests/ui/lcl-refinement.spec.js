import {test,expect} from '@playwright/test';
test('extension engages ACL/collaterals; LCL takes up slack; ON never fades',async({page})=>{
 await page.goto('http://127.0.0.1:8080/?review=ligaments&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 await page.locator('#boneVisibility').click();await page.locator('[data-view="lateral"]').click();
 await page.mouse.move(1000,500);await page.mouse.wheel(0,-700);
 const set=async(kind,value)=>{await page.locator('[data-motion="'+kind+'"]').click();await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));await expect.poll(async()=>Math.abs((await page.evaluate(()=>window.atlasQA())).renderedAngles[kind==='rot'?'rot':'flex']-value)).toBeLessThan(.001);};
 const takeUp=()=>page.evaluate(()=>window.atlasLigamentQA().entries.find(e=>e.name==='Fibular collateral ligament.r').takeUp);
 await set('flex',0);await expect.poll(takeUp).toBeGreaterThan(.999);
 const ext=await page.evaluate(()=>window.atlasPresentationQA());for(const key of ['acl','mcl','lcl'])expect(ext.scores[key]).toBeGreaterThan(.999);expect(ext.scores.pcl).toBeLessThan(.001);
 expect(Object.values(ext.materials).every(m=>m.opacity===1)).toBeTruthy();await page.screenshot({path:'test-results/lcl-extension.png'});
 await set('flex',90);await expect.poll(takeUp).toBeLessThan(.001);expect(Object.values((await page.evaluate(()=>window.atlasPresentationQA())).materials).every(m=>m.opacity===1)).toBeTruthy();await page.screenshot({path:'test-results/lcl-flexion-slack.png'});
 await set('rot',30);const route=await page.evaluate(()=>window.atlasLigamentQA().entries.find(e=>e.name==='Fibular collateral ligament.r'));expect(route.routeLength).toBeCloseTo(Math.max(route.referenceLength,route.span),6);await page.screenshot({path:'test-results/lcl-external-taut.png'});
 const row=page.locator('[data-tissue="Fibular collateral ligament.r"]');await row.click();await expect.poll(async()=>(await page.evaluate(()=>window.atlasPresentationQA())).materials['Fibular collateral ligament.r'].opacity).toBe(.3);
 await row.click();expect((await page.evaluate(()=>window.atlasPresentationQA())).materials['Fibular collateral ligament.r'].visible).toBeFalsy();
});
