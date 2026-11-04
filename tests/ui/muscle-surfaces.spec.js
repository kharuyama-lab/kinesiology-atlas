import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test('simultaneous knee muscles remain visible across flexion',async({page})=>{
 await page.setViewportSize({width:1800,height:1000});await page.goto('http://127.0.0.1:8080/?review=muscles&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:90000});mkdirSync('docs/screenshots/muscle-surfaces',{recursive:true});const report=[];
 for(const angle of [0,60,90,120]){await page.locator('#motionSlider').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},angle);await expect.poll(async()=>Math.abs((await page.evaluate(()=>atlasQA())).renderedAngles.flex-angle)).toBeLessThan(.001);await page.locator('[data-tissue]').evaluateAll(rows=>{for(const row of rows){if(row.hidden||row.disabled||!row.closest('#muscleList'))continue;const target=row.dataset.tissue==='Iliotibial tract.r'?'fade':'on';while(row.dataset.state!==target)row.click();}});
 const visible={};for(const view of ['medial','front','back','lateral']){await page.locator('[data-view="'+view+'"]').click();await page.waitForTimeout(500);for(const name of ['Sartorius muscle.r','Gracilis muscle.r']){if(visible[name])continue;const point=await page.evaluate(n=>atlasPickQA(n),name);if(point)visible[name]=view;}await page.screenshot({path:`docs/screenshots/muscle-surfaces/all-${angle}-${view}.png`});}report.push({angle,visible,routes:await page.evaluate(()=>atlasMuscleGeometryQA().routes)});}
 writeFileSync('docs/muscle-surface-audit.json',JSON.stringify(report,null,2));for(const r of report)for(const n of ['Sartorius muscle.r','Gracilis muscle.r'])expect(r.visible[n],n+' visible with other muscles at '+r.angle).toBeTruthy();
});

