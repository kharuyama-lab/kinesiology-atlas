import {test,expect} from '@playwright/test';
test('canvas selection cycles only the selected Whole Body muscle',async({page})=>{
 await page.goto((process.env.ATLAS_SELECTION_URL||'http://127.0.0.1:8080/')+'?qa');await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:90000});
 const before=await page.evaluate(()=>window.atlasQA());expect(before.focus).toBe('body');
 const canvas=await page.locator('canvas').boundingBox();let selected;
 for(let y=.25;y<.95&&!selected;y+=.07)for(let x=.3;x<.75&&!selected;x+=.05){
  await page.mouse.click(canvas.x+canvas.width*x,canvas.y+canvas.height*y);
  const popup=page.locator('#floatingSelection');if(!await popup.isVisible())continue;
  const english=await popup.locator('.selectedEnglish').textContent();
  const match=before.tissueMeshes.find(t=>t.group==='muscle'&&t.name.replace(/\.[rl]$/,'')===english.replace(/ \((Right|Left)\)$/,''));
  if(match)selected=match.name;
 }
 expect(selected,'a muscle was selected by clicking the model').toBeTruthy();
 for(const expected of ['Fade','OFF','ON']){
  await page.locator('#floatingSelection button').click();await expect(page.locator('#floatingSelection button')).toHaveText(expected);
  const after=await page.evaluate(()=>window.atlasQA());
  expect(after.bodyStates[selected]).toBe(expected.toLowerCase());
  for(const name of before.registered.filter(n=>n!==selected))expect(after.bodyStates[name]||'on',name).toBe(before.bodyStates[name]||'on');
 }
});
