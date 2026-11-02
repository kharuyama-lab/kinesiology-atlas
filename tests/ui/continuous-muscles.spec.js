import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
test('continuous whole muscle course and rendered hover throughout flexion',async({page})=>{
 await page.setViewportSize({width:1800,height:1000});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8080/?review=muscles&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:90000});
 await page.locator('canvas').hover();await page.mouse.wheel(0,240);
 const snap=()=>page.evaluate(()=>atlasQA());const input=async v=>page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},v);mkdirSync('docs/screenshots/continuous-muscles',{recursive:true});const report=[];
 for(const angle of [0,30,60,90,120]){await input(angle);await expect.poll(async()=>Math.abs((await snap()).renderedAngles.flex-angle)).toBeLessThan(.001);await page.locator('[data-view="lateral"]').click();const audit=await page.evaluate(()=>atlasMuscleGeometryQA());report.push({angle,curves:audit.curves});for(const c of audit.curves){expect(c.minProgress,c.name+' backwards at '+angle).toBeGreaterThan(0);expect(c.maxTurn,c.name+' kink at '+angle).toBeLessThan(.4);}await page.screenshot({path:`docs/screenshots/continuous-muscles/knee-${angle}.png`});}
 // Isolate each reported muscle and aim at actual deformed triangles, not rest bounds.
 await input(90);await page.locator('#boneVisibility').click();await page.locator('#boneVisibility').click();
 const shown=(await snap()).tissueMeshes.filter(t=>t.group==='muscle'&&t.visible).map(t=>t.name);expect(shown.length).toBeGreaterThanOrEqual(16);for(const name of shown){
 await page.locator('[data-tissue]').evaluateAll((rows,name)=>{for(const row of rows){if(row.hidden||row.disabled||!row.closest('#muscleList'))continue;const target=row.dataset.tissue===name?'on':'off';while(row.dataset.state!==target)row.click();}},name);
 let point=null;for(const view of ['lateral','back','medial','front']){await page.locator(`[data-view="${view}"]`).click();point=await page.evaluate(name=>atlasPickQA(name),name);if(point)break;}expect(point,name+' must be pickable after bending').not.toBeNull();await page.mouse.move(point.x,point.y);await expect(page.locator('#hoverPopup')).toBeVisible();await expect(page.locator('#hoverPopup small')).toHaveText(name.replace(/\.r$/,''));await page.screenshot({path:`docs/screenshots/continuous-muscles/${name.split(' ')[0]}-${name.includes('Lateral')?'lateral':'isolated'}.png`});}
 writeFileSync('docs/continuous-muscle-audit.json',JSON.stringify({poses:report,hoverNames:shown},null,2));expect(errors).toEqual([]);
});
