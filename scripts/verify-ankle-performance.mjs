import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const solve=process.argv.includes('--solve'),browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/?focus=ankle&qa'+(solve?'&ankle-solve':''));await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:120000});
 await expect(page.locator('#muscleDetails')).not.toHaveAttribute('open','');
 for(const key of ['dorsiflex','plantarflex','pronation','supination'])await expect(page.locator(`[data-muscle-group="${key}"]`)).toBeVisible();
 await expect(page.locator('#retinaculumVisibility')).toBeVisible();await expect(page.locator('#retinaculumVisibility')).toHaveAttribute('data-state','fade');
 const samples=await page.evaluate(async()=>{
  const slider=document.querySelector('#motionSlider'),result=[];let last=performance.now();
  for(let i=0;i<40;i++){
   const sent=performance.now();slider.value=-30+Math.sin(i/8)*10;slider.dispatchEvent(new Event('input',{bubbles:true}));
   await new Promise(requestAnimationFrame);const now=performance.now();result.push({frameMs:now-last,inputToFrameMs:now-sent,...atlasAnklePerformanceQA()});last=now;
  }return result;
 });
 const percentile=(values,p)=>values.slice().sort((a,b)=>a-b)[Math.floor((values.length-1)*p)],report={path:solve?'exact contact solver':'interpolated contact cache',samples,frameMedian:percentile(samples.map(s=>s.frameMs),.5),frameP95:percentile(samples.map(s=>s.frameMs),.95),updateMedian:percentile(samples.map(s=>s.updateMs),.5),frameWorkMedian:percentile(samples.map(s=>s.totalFrameMs),.5),inputToFrameP95:percentile(samples.map(s=>s.inputToFrameMs),.95),errors};
 console.log(JSON.stringify({...report,samples:undefined},null,2));expect(errors).toEqual([]);expect(samples.some(s=>s.workerError)).toBe(false);expect(samples.some(s=>Number.isFinite(s.workerMs))).toBe(!solve);
 if(!solve){expect(report.updateMedian).toBeLessThan(25);expect(report.frameWorkMedian).toBeLessThan(35);expect(report.inputToFrameP95).toBeLessThan(100);}
 fs.writeFileSync(`docs/ANKLE_PERFORMANCE_${solve?'BEFORE':'AFTER'}.json`,JSON.stringify({...report,status:solve?'measured':'passed',budgets:solve?null:{updateMedian:25,frameWorkMedian:35,inputToFrameP95:100}},null,2)+'\n');
}finally{await browser.close();}
