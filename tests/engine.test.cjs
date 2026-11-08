const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { JSDOM } = require('jsdom');
const data = readFileSync('extension/data/fr_FR.txt', 'utf8');
function setup(body) {
  const dom = new JSDOM(`<html lang="fr"><body>${body}</body></html>`, { runScripts: 'outside-only' });
  for (const script of ['engine.js', 'content.js']) dom.window.eval(readFileSync(`extension/${script}`, 'utf8'));
  return dom;
}
test('dictionary handles accents, case, apostrophes, variants and unknown words', () => {
  const dom = setup('');
  const engine = dom.window.FrenchIPA, dict = engine.parse(data);
  assert.ok(dict.size > 240000);
  assert.equal(engine.lookup('BONJOUR', dict), '/bɔ̃ʒuʁ/');
  assert.equal(engine.lookup('e\u0301cole', dict), engine.lookup('école', dict));
  assert.equal(engine.lookup('l’ami', dict), '/lami/');
  assert.equal(engine.lookup('est', dict), '/ɛst/');
  assert.equal(engine.lookup('zzzzzzzzzzz', dict), null);
  dom.window.close();
});
test('annotates, changes position, avoids duplicate wrappers and restores exact text and links', () => {
  const dom = setup('<p>Bonjour, l’ami ! <a href="/test">Le soleil</a> 🐈 zzzzzzzzzzz.</p>');
  const { document, FrenchIPAController: controller } = dom.window;
  const original = document.body.innerHTML, link = document.querySelector('a');
  const first = controller.set({ enabled:true, position:'above', dictionary:data });
  assert.equal(first.count, 4);
  assert.equal(document.querySelector('ruby').dataset.fripaPosition, 'above');
  assert.equal(controller.set({ enabled:true, position:'below' }).count, first.count);
  assert.equal(document.querySelectorAll('ruby ruby').length, 0);
  assert.equal(document.querySelector('ruby').dataset.fripaPosition, 'below');
  controller.set({ enabled:false });
  assert.equal(document.body.innerHTML, original);
  assert.equal(document.querySelector('a'), link);
  dom.window.close();
});
test('skips forms, code, existing ruby, hidden content and explicitly non-French sections', () => {
  const dom = setup('<p>bonjour</p><textarea>bonjour</textarea><div contenteditable="">bonjour</div><div contenteditable="plaintext-only">bonjour</div><code>bonjour</code><div hidden>bonjour</div><p lang="en">bonjour</p><ruby>bonjour<rt>test</rt></ruby>');
  assert.equal(dom.window.FrenchIPAController.set({ enabled:true, dictionary:data }).count, 1);
  dom.window.close();
});
test('observes added text and stops observing when hidden', async () => {
  const dom = setup('<p>bonjour</p>');
  const c = dom.window.FrenchIPAController;
  c.set({enabled:true, dictionary:data});
  const p = dom.window.document.createElement('p');
  p.textContent = 'soleil'; dom.window.document.body.append(p);
  await new Promise(resolve => setTimeout(resolve, 230));
  assert.equal(c.state().count, 2);
  c.set({enabled:false});
  p.textContent = 'bonjour';
  await new Promise(resolve => setTimeout(resolve, 230));
  assert.equal(c.state().count, 0);
  dom.window.close();
});
