import {test,expect} from '@playwright/test';
test('loads with all external hosts blocked, without query flags or test replacements',async({page})=>{
 const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1'){external.push(url.href);return route.abort();}return route.continue();});
 await page.goto('http://127.0.0.1:8080/');
 await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:30000});await expect(page.locator('#loadOverlay')).toBeHidden();
 await page.screenshot({path:'test-results/local-loading-ready.png'});expect(errors).toEqual([]);expect(external).toEqual([]);
});
test('missing JS module shows failure and Retry instead of an endless spinner',async({page})=>{
 await page.route('**/src/tissue-follow.js',route=>route.fulfill({status:404,body:'Not found'}));
 await page.goto('http://127.0.0.1:8080/');
 await expect(page.locator('#modelStatus')).toHaveText('Load failed');await expect(page.locator('#loadOverlay')).toContainText('Unable to load the atlas');await expect(page.locator('#loadOverlay button')).toHaveText('Retry');
});
