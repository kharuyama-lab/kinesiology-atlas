import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const baseline=process.argv.includes('--baseline'),only=process.argv.find(a=>a.startsWith('--motion='))?.split('=')[1];
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/?focus=ankle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:120000});
 const report=[];
 for(const [motion,min,max] of [['flex',-40,20],['invert',-10,20],['adduct',-10,15],['compound',-15,20]]){
  if(only&&only!==motion)continue;await page.locator(`[data-motion="${motion}"]`).click();
  for(const value of [min,min/2,0,max/2,max,0]){
   await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
   await expect.poll(()=>page.evaluate(v=>Math.abs(atlasAnkleStateQA().value-v),value),{timeout:90000}).toBeLessThan(.000001);
   const contacts=await page.evaluate(()=>atlasAnkleMuscleContactQA()),bad=contacts.filter(c=>c.maxAddedDepth>.00025);
   console.log(motion,value,JSON.stringify(bad.map(c=>({name:c.name,bone:c.worst.bone,mm:c.maxAddedDepth*1000}))));
   report.push({motion,value,contacts});
  }
 }
 expect(errors).toEqual([]);const failed=report.some(s=>s.contacts.some(c=>c.maxAddedDepth>=.00025));
 fs.writeFileSync(`docs/ANKLE_MUSCLE_CONTACT_${baseline?'BASELINE':'VERIFICATION'}.json`,JSON.stringify({date:'2026-11-17 Asia/Tokyo',baseline,status:baseline?'baseline':failed?'failed':'passed',method:'all displayed muscle vertices and triangle centroids against all registered right leg/foot bones; added penetration relative to the same original source point',tolerance:.00025,samples:report,pageErrors:errors},null,2)+'\n');
 if(!baseline)for(const sample of report)for(const c of sample.contacts)expect(c.maxAddedDepth,`${sample.motion} ${sample.value}: ${c.name}`).toBeLessThan(.00025);
}finally{await browser.close();}
