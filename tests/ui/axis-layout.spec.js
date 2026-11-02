import {test,expect} from '@playwright/test';
test('femoral shaft stays fixed while tibial guides move; unified compact controls',async({page})=>{
 await page.goto('http://127.0.0.1:8080/?review=knee&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 const set=async v=>{await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(v));await expect.poll(async()=>Math.abs((await page.evaluate(()=>window.atlasQA())).renderedAngles.flex-v)).toBeLessThan(.001);};
 await set(0);const before=await page.evaluate(()=>window.atlasAxisQA());await set(90);const after=await page.evaluate(()=>window.atlasAxisQA());
 expect(after.names).toEqual(['SI tibia','AP tibia','SI femur']);
 const distance=(a,b)=>Math.hypot(...a.flat().map((v,i)=>v-b.flat()[i]));
 expect(distance(before.segments[2],after.segments[2])).toBeLessThan(.0001);expect(distance(before.segments[0],after.segments[0])).toBeGreaterThan(.01);expect(distance(before.segments[1],after.segments[1])).toBeGreaterThan(.01);
 for(const name of ['rot','stress','flex']){await page.locator('[data-motion="'+name+'"]').click();expect((await page.evaluate(()=>window.atlasAxisQA())).visible).toBeTruthy();}
 await page.setViewportSize({width:1280,height:800});expect(await page.locator('#sidebar').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
 const controls=await page.locator('.displayControls button').evaluateAll(els=>els.map(el=>({y:el.getBoundingClientRect().y,h:el.getBoundingClientRect().height})));expect(controls[0]).toEqual(controls[1]);
 await set(90);await page.locator('[data-view="iso"]').click();await page.screenshot({path:'test-results/axis-layout.png'});
});
