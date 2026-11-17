import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/?focus=ankle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:120000});
 await page.locator('[data-joint-bulk="muscle"][data-display-state="off"]').click();await page.locator('[data-joint-bulk="connective"][data-display-state="off"]').click();await page.locator('#ligamentDetails').evaluate(el=>el.open=true);await page.locator('[data-tissue="Posterior talofibular ligament.r"]').click();
 const samples=await page.evaluate(async()=>{
  const result=[],name='Posterior talofibular ligament.r',slider=document.querySelector('#motionSlider');
  for(let i=0;i<240;i++){
   slider.value=-10+30*Math.sin(2*Math.PI*i/240);slider.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(requestAnimationFrame);
   const entry=atlasAnkleLigamentGeometryQA(name)[0];result.push({value:atlasAnkleStateQA().value,...entry});
  }return result;
 });
 let maxRouteStep=0,maxAnchorError=0,worst=null;
 const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
 for(let k=0;k<samples.length;k++){const s=samples[k];for(const i of s.anchors)maxAnchorError=Math.max(maxAnchorError,distance(s.positions[i],s.base[i]));if(!k)continue;for(let i=0;i<s.positions.length;i++)if(!s.anchors.includes(i)){const offset=s.positions[i].map((n,j)=>n-s.base[i][j]),previous=samples[k-1].positions[i].map((n,j)=>n-samples[k-1].base[i][j]),jump=distance(offset,previous);if(jump>maxRouteStep){maxRouteStep=jump;worst={frame:k,value:s.value,vertex:i,filter:s.filter,previous:samples[k-1].filter};}}}
 console.log({frames:samples.length,maxRouteStep,maxAnchorError,worst});expect(maxAnchorError).toBeLessThan(.0000001);expect(maxRouteStep).toBeLessThan(.002);
 await page.locator('#resetPose').click();await expect.poll(()=>page.evaluate(()=>atlasAnkleStateQA().ligamentSettling),{timeout:60000}).toBe(false);
 const ligaments=await page.evaluate(()=>atlasQA().ankleLigamentAudit);for(const e of ligaments){expect(e.routeValid,e.name).toBe(true);expect(e.maxPenetration,e.name).toBeLessThan(.0001);expect(e.maxFacePenetration,e.name).toBeLessThan(.0001);}
 expect(errors).toEqual([]);fs.writeFileSync('docs/ANKLE_PTFL_CONTINUITY_VERIFICATION.json',JSON.stringify({status:'passed',frames:samples.length,maxRouteStep,maxAnchorError,ligaments,pageErrors:errors},null,2)+'\n');
}finally{await browser.close();}
