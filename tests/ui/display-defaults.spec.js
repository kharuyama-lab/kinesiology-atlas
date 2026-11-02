import {test,expect} from '@playwright/test';
test('display order and fresh defaults preserve user choices across modes',async({page})=>{
 await page.goto('http://127.0.0.1:8080/?review=ligaments&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 expect(await page.locator('.displayControls button').evaluateAll(els=>els.map(e=>e.id))).toEqual(['boneVisibility','patellaVisibility','axisVisibility']);
 await expect(page.locator('#patellaVisibility')).toHaveAttribute('data-state','fade');await expect(page.locator('#axisToggle')).not.toBeChecked();expect((await page.evaluate(()=>window.atlasAxisQA())).visible).toBeFalsy();
 await page.locator('#axisVisibility').click();await page.locator('#patellaVisibility').click();
 await page.locator('[data-mode="anatomy"]').click();await page.locator('[data-mode="kinesiology"]').click();await expect(page.locator('#axisToggle')).toBeChecked();await expect(page.locator('#patellaVisibility')).toHaveAttribute('data-state','off');
 await page.locator('[data-focus="body"]').click();await page.locator('[data-focus="knee"]').click();await expect(page.locator('#patellaVisibility')).toHaveAttribute('data-state','fade');await expect(page.locator('#axisToggle')).not.toBeChecked();
 await page.screenshot({path:'test-results/display-defaults.png'});
});
