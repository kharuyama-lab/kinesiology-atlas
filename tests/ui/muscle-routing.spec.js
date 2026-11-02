import {test,expect} from '@playwright/test';
import {Vector3,Quaternion} from 'three';
import {mkdirSync,writeFileSync} from 'node:fs';
test('muscle bellies follow their bone frames, Achilles continuity, action groups and legacy ITB',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8080/?review=muscles&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 const snap=()=>page.evaluate(()=>atlasQA());const input=async v=>page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},v);
 mkdirSync('docs/screenshots/muscle-routing',{recursive:true});
 const records=[];
 for(const angle of [0,60,90,120]){await input(angle);await expect.poll(async()=>Math.abs((await snap()).renderedAngles.flex-angle)).toBeLessThan(.01);
 const q=await snap(),audit=await page.evaluate(()=>atlasMuscleGeometryQA()),h=new Vector3(...audit.hipCenter),k=new Vector3(...audit.kneeCenter),hip=new Quaternion(...q.hip),knee=new Quaternion(...q.knee),translation=new Vector3(...q.kneeTranslation),span=h.y-k.y;
 const errorsByMuscle={};
 for(const e of audit.entries){if(!/gastrocnemius|Calcaneal tendon|Semitendinosus|Semimembranosus|biceps femoris|Sartorius|Gracilis/.test(e.name))continue;const pts=e.points.filter(p=>/gastrocnemius|Calcaneal/.test(e.name)?p.rest[1]<k.y-span*.15:p.rest[1]<h.y-span*.45&&p.rest[1]>k.y+span*.15);if(!pts.length)continue;const delta=Math.max(...pts.map(p=>{const v=new Vector3(...p.rest);if(/gastrocnemius|Calcaneal/.test(e.name))v.sub(k).applyQuaternion(knee).add(k).add(translation);v.sub(h).applyQuaternion(hip).add(h);return v.distanceTo(new Vector3(...p.position));}));errorsByMuscle[e.name]=delta;expect(delta,e.name+' belly at '+angle).toBeLessThan(span*.015);}
 records.push({angle,errorsByMuscle});await page.locator('[data-view="lateral"]').click();await page.screenshot({path:`docs/screenshots/muscle-routing/knee-${angle}.png`});}
 const itb=page.locator('[data-tissue="Iliotibial tract.r"]');await expect(itb).toHaveAttribute('data-state','fade');expect((await snap()).tissueMeshes.find(t=>t.name==='Calcaneal tendon.r').visible).toBeTruthy();
 for(const group of ['flex','ext','ir','er']){await page.locator(`[data-muscle-group="${group}"]`).click();const q=await snap();expect(q.states['Rectus femoris muscle.r']).toBe(group==='ext'?'on':'off');expect(q.states['Long head of biceps femoris.r']).toBe(['flex','er'].includes(group)?'on':'off');expect(q.states['Calcaneal tendon.r']).toBe(group==='flex'?'on':'off');}
 await page.locator('[data-focus="hip"]').click();await expect(itb).toHaveAttribute('data-state','fade');await expect(page.locator('[data-muscle-group]')).toHaveCount(6);
 for(const angle of [0,90,110]){await input(angle);await expect.poll(async()=>Math.abs((await snap()).hip[0]+Math.sin(angle*Math.PI/360))).toBeLessThan(.001);await page.locator('[data-view="lateral"]').click();await page.screenshot({path:`docs/screenshots/muscle-routing/hip-${angle}.png`});}
 await page.locator('[data-muscle-group="flex"]').click();await page.locator('[data-mode="anatomy"]').click();await page.locator('[data-mode="kinesiology"]').click();await expect(page.locator('[data-muscle-group="flex"]')).toHaveClass(/selected/);
 await page.setViewportSize({width:1280,height:800});expect(await page.locator('#sidebar').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
 // Inspect the specifically reported Hip muscles without overlying surfaces.
 await page.setViewportSize({width:1440,height:1000});await input(90);await expect.poll(async()=>Math.abs((await snap()).hip[0]+Math.SQRT1_2)).toBeLessThan(.001);
 await page.locator('[data-tissue]').evaluateAll(rows=>{const keep=new Set(['Psoas major.r','Iliacus muscle.r','Sartorius muscle.r']);for(const row of rows){if(row.hidden||row.disabled||!row.closest('#muscleList'))continue;const target=keep.has(row.dataset.tissue)?'on':'off';while(row.dataset.state!==target)row.click();}});
 await page.locator('[data-view="front"]').click();await page.locator('#boneVisibility').click();await page.screenshot({path:'docs/screenshots/muscle-routing/hip-90-iliopsoas-sartorius.png'});await page.locator('[data-view="lateral"]').click();await page.screenshot({path:'docs/screenshots/muscle-routing/hip-90-iliopsoas-sartorius-lateral.png'});
 await page.locator('[data-tissue]').evaluateAll(rows=>{const keep=new Set(['Iliotibial tract.r','Tensor fasciae latae.r','Gluteus maximus muscle.r']);for(const row of rows){if(row.hidden||row.disabled||!row.closest('#muscleList'))continue;const target=keep.has(row.dataset.tissue)?(row.dataset.tissue==='Iliotibial tract.r'?'fade':'on'):'off';while(row.dataset.state!==target)row.click();}});
 await page.locator('[data-view="lateral"]').click();await page.screenshot({path:'docs/screenshots/muscle-routing/hip-90-itb.png'});
 writeFileSync('docs/muscle-belly-frame-audit.json',JSON.stringify(records,null,2));expect(errors).toEqual([]);
});
