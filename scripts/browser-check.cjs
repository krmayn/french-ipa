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
 assert.ok(await page.locator('#above .fripa-word').count() > 20);
 // IPA is above/below its word, and the French word stays on the surrounding text's baseline.
 const layout = id => page.evaluate(id => {
  const word = document.querySelector(`#${id} .fripa-word`), base = word.querySelector('.fripa-base'), ipa = word.querySelector('.fripa-ipa');
  const text = [...word.parentNode.childNodes].find(n => n.nodeType === 3 && /\S/.test(n.textContent));
  const plain = document.createRange(); plain.selectNodeContents(text);
  const french = document.createRange(); french.selectNodeContents(base);
  return {ipaAbove: ipa.getBoundingClientRect().bottom <= base.getBoundingClientRect().top + 1, baseline: Math.abs(plain.getBoundingClientRect().bottom - french.getBoundingClientRect().bottom)};
 }, id);
 const above = await layout('above'), below = await layout('below');
 assert.equal(above.ipaAbove, true); assert.equal(below.ipaAbove, false);
 assert.ok(above.baseline < 1 && below.baseline < 1, 'French words stay on the text baseline');
 // The bundled IPA font (correct tilde placement on ɔ̃ ɑ̃ ɛ̃ œ̃) must load rather than a system fallback.
 assert.equal(await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('16px "French IPA Phonetic"', 'mɔ̃'); }), true);
 await page.setViewportSize({width:1200,height:920});
 fs.mkdirSync('docs',{recursive:true});
 await page.screenshot({path:'docs/comparison.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
 await page.locator('#text').fill('Bonjour le monde !');
 await page.getByRole('button', {name:'Compare this text'}).click();
 assert.equal(await page.locator('#above .fripa-word').count(), 3);
 const extensions = await context.newPage();
 await extensions.goto('chrome://extensions');
 await extensions.locator('extensions-item').first().waitFor();
 const id = await extensions.locator('extensions-item').first().getAttribute('id');
 const popup = await context.newPage();
 await popup.goto(`chrome-extension://${id}/popup.html`);
 await popup.getByRole('button', {name:'Open a regular web page'}).waitFor();
 // activeTab requires a real toolbar click; this smoke check does not simulate that grant.
 console.log('PASS: desktop/mobile preview, IPA above/below with baseline alignment, interactive text, packaged extension load, restricted-page feedback');
 } finally { await context.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});
