import {chromium,expect} from '@playwright/test';
import {Color} from 'three';
import fs from 'node:fs';
import {ankleLigamentColors} from '../config/ankle-ligaments.js';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/?focus=ankle&qa');
 await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:90000});
 const snapshot=()=>page.evaluate(()=>atlasAnkleTensionQA());
 const slider=async value=>{await page.locator('#motionSlider').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);await expect.poll(()=>page.evaluate(v=>Math.abs(atlasAnkleStateQA().value-v),value),{timeout:30000}).toBeLessThan(1e-7);};
 const report={status:'passed',samples:[],pageErrors:errors};
 for(const value of [20,-40,0]){
  await slider(value);const q=await snapshot();
  for(const [name,cue] of Object.entries(q.cues)){
   const m=q.materials[name];expect(m.glow).toBeGreaterThanOrEqual(0);
   if(cue.engagement>0)expect(m.glow).toBeGreaterThan(0);else expect(m.glow).toBe(0);
   const base=new Color(ankleLigamentColors[name]);expect(m.emissive).toEqual(base.toArray());
   const actual=new Color().fromArray(m.color).getHSL({}),original=base.getHSL({});
   expect(actual.h).toBeCloseTo(original.h,6);
  }
  report.samples.push({value,...q});
 }
 await slider(20);const pulses=[];for(let i=0;i<12;i++){pulses.push((await snapshot()).materials['Tibiocalcaneal ligament.r'].glow);await page.waitForTimeout(150);}
 expect(Math.max(...pulses)-Math.min(...pulses)).toBeGreaterThan(.15);report.pulses=pulses;
 for(const state of ['fade','off','on']){
  await page.locator(`[data-joint-bulk="connective"][data-display-state="${state}"]`).click();await page.waitForTimeout(80);
  const q=await snapshot();expect(q.materials['Tibiocalcaneal ligament.r'].opacity).toBe(state==='fade'?.3:1);
  if(state==='off')expect(q.materials['Tibiocalcaneal ligament.r'].glow).toBe(0);
 }
 await page.locator('[data-view="medial"]').click();await page.locator('#boneVisibility').click();
 await page.screenshot({path:'docs/screenshots/ankle-ligaments/tension-dorsiflexion.png'});
 await slider(-40);await page.screenshot({path:'docs/screenshots/ankle-ligaments/tension-plantarflexion.png'});
 for(const kind of ['invert','adduct','compound']){await page.locator('[data-motion="'+kind+'"]').click();for(const value of [-10,10,0]){await slider(value);const q=await snapshot();expect(q.cues['Talocalcaneal interosseous ligament.r'].basis).toBe('restraint');for(const [name,cue] of Object.entries(q.cues)){const m=q.materials[name];expect(m.emissive).toEqual(new Color(ankleLigamentColors[name]).toArray());if(cue.engagement>0)expect(m.glow).toBeGreaterThan(0);else expect(m.glow).toBe(0);expect(cue.slack).toBe(0);}report.samples.push({kind,value,...q});}}
 await page.locator('[data-mode="anatomy"]').click();await expect.poll(async()=>Object.values((await snapshot()).materials).some(m=>m.glow>0)).toBe(false);
 expect(errors).toEqual([]);
 fs.writeFileSync('docs/ANKLE_TENSION_PRESENTATION_VERIFICATION.json',JSON.stringify(report,null,2)+'\n');
 console.log('Passed: all mapped tension cues reach the material, identity hue preserved, pulse varies, neutral/Fade/Off/Anatomy reset.');
}finally{await browser.close();}
