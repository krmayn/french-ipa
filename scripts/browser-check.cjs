const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
 const context = await chromium.launchPersistentContext('', {channel:'chromium',headless:true,args:[`--disable-extensions-except=${path.resolve('extension')}`,`--load-extension=${path.resolve('extension')}`]});
 try {
 const page = await context.newPage();
 await page.goto('http://127.0.0.1:8768/preview.html');
 await page.waitForFunction(() => document.querySelector('#status').textContent.includes('annotated'));
 assert.ok(await page.locator('#above ruby').count() > 20);
 assert.equal(await page.locator('#above ruby').first().evaluate(n => getComputedStyle(n).rubyPosition), 'over');
 assert.equal(await page.locator('#below ruby').first().evaluate(n => getComputedStyle(n).rubyPosition), 'under');
 await page.setViewportSize({width:1200,height:920});
 fs.mkdirSync('docs',{recursive:true});
 await page.screenshot({path:'docs/comparison.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
 await page.locator('#text').fill('Bonjour le monde !');
 await page.getByRole('button', {name:'Compare this text'}).click();
 assert.equal(await page.locator('#above ruby').count(), 3);
 const extensions = await context.newPage();
 await extensions.goto('chrome://extensions');
 await extensions.locator('extensions-item').first().waitFor();
 const id = await extensions.locator('extensions-item').first().getAttribute('id');
 const popup = await context.newPage();
 await popup.goto(`chrome-extension://${id}/popup.html`);
 await popup.getByRole('button', {name:'Open a regular web page'}).waitFor();
 // activeTab requires a real toolbar click; this smoke check does not simulate that grant.
 console.log('PASS: desktop/mobile preview, ruby above/below, interactive text, packaged extension load, restricted-page feedback');
 } finally { await context.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});
