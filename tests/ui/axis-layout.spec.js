import {test,expect} from '@playwright/test';
test('femoral shaft stays fixed while tibial guides move; unified compact controls',async({page})=>{
 await page.goto('http://127.0.0.1:8080/?review=knee&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 const set=async v=>{await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(v));await expect.poll(async()=>Math.abs((await page.evaluate(()=>window.atlasQA())).renderedAngles.flex-v)).toBeLessThan(.001);};
 await set(0);const before=await page.evaluate(()=>window.atlasAxisQA());await set(90);const after=await page.evaluate(()=>window.atlasAxisQA());
 expect(after.names).toEqual(['SI tibia','ML tibia','AP tibia','SI femur','ML femur']);
 const distance=(a,b)=>Math.hypot(...a.flat().map((v,i)=>v-b.flat()[i]));
 expect(distance(before.segments[3],after.segments[3])).toBeLessThan(.0001);expect(distance(before.segments[0],after.segments[0])).toBeGreaterThan(.01);expect(distance(before.segments[1],after.segments[1])).toBeGreaterThan(.01);
 for(const name of ['rot','stress','flex']){await page.locator('[data-motion="'+name+'"]').click();expect((await page.evaluate(()=>window.atlasAxisQA())).visible).toBeTruthy();}
 await page.setViewportSize({width:1280,height:800});expect(await page.locator('#sidebar').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
 const controls=await page.locator('.displayControls button').evaluateAll(els=>els.map(el=>({y:el.getBoundingClientRect().y,h:el.getBoundingClientRect().height})));expect(controls[0]).toEqual(controls[1]);
 for(const index of [3,4])expect(distance(before.segments[index],after.segments[index])).toBeLessThan(.0001);
 for(const segments of [before.segments,after.segments]){const centers=segments.slice(0,3).map(pair=>pair[0].map((v,i)=>(v+pair[1][i])/2));expect(distance(centers[0],centers[1])).toBeLessThan(1e-6);expect(distance(centers[0],centers[2])).toBeLessThan(1e-6);}
 // The actual rendered transverse tibial line must turn during terminal extension.
 await set(0);const locked=await page.evaluate(()=>window.atlasAxisQA());await set(20);const unlocked=await page.evaluate(()=>window.atlasAxisQA());
 const dot=locked.directions[1].reduce((sum,v,i)=>sum+v*unlocked.directions[1][i],0);expect(Math.acos(Math.min(1,dot))*180/Math.PI).toBeGreaterThan(7);
 for(const kind of ['flex','rot','stress']){await page.locator('[data-motion="'+kind+'"]').click();await page.locator('#motionSlider').evaluate(el=>{el.value='1.7';el.dispatchEvent(new Event('input',{bubbles:true}));});await expect(page.locator('#angleReadout')).not.toContainText('.');}
 await page.locator('[data-motion="flex"]').click();await set(90);await page.locator('[data-view="iso"]').click();await page.screenshot({path:'test-results/axis-layout.png'});
});
