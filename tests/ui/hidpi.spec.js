import {test,expect} from '@playwright/test';
test('HiDPI canvas keeps CSS size and knee centering in a narrow preview',async({browser})=>{
 const context=await browser.newContext({viewport:{width:462,height:1118},deviceScaleFactor:2});const page=await context.newPage();
 await page.goto('http://127.0.0.1:8080/?review=knee&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 await expect.poll(async()=>Math.abs((await page.evaluate(()=>window.atlasQA())).hip[0])).toBeGreaterThan(.706);
 const sizes=await page.evaluate(()=>{const h=document.querySelector('#canvasHost').getBoundingClientRect(),c=document.querySelector('canvas').getBoundingClientRect();return {host:[h.width,h.height],canvas:[c.width,c.height],focus:window.atlasQA().focusNDC};});
 for(let i=0;i<2;i++){expect(Math.abs(sizes.host[i]-sizes.canvas[i])).toBeLessThan(1);expect(Math.abs(sizes.focus[i])).toBeLessThan(.001);}
 await page.screenshot({path:'test-results/knee-review-hidpi.png'});await context.close();
});
