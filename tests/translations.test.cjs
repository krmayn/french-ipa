const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {JSDOM}=require('jsdom');
function setup(body){
 const dom=new JSDOM(`<html lang="fr"><body>${body}</body></html>`,{runScripts:'outside-only'});
 for(const script of ['engine.js','content.js','translation-content.js'])dom.window.eval(readFileSync(`extension/${script}`,'utf8'));
 return dom;
}
function answer(plan){return {generation:plan.generation,results:plan.tasks.map(t=>({id:t.id,text:`English: ${t.text}`}))};}
test('both mode groups sentences across inline markup and preserves original linked elements',()=>{
 const dom=setup('<p>Bonjour <a href="/ami">mon ami</a>. Le soleil brille.</p>');
 const doc=dom.window.document, c=dom.window.FrenchInterlinear, link=doc.querySelector('a'), original=doc.body.textContent;
 const plan=c.prepare('both');
 assert.equal(plan.sentences,2);assert.equal(plan.words,6);
 assert.ok(plan.tasks.some(t=>t.text==='Bonjour mon ami.'));
 const result=c.apply(answer(plan));assert.equal(result.words,6);assert.equal(result.sentences,2);
 assert.equal(doc.querySelector('a'),link);assert.equal(doc.querySelectorAll('.fripa-translation').length,2);
 c.clear();assert.equal(doc.body.textContent,original);assert.equal(doc.querySelector('a'),link);dom.window.close();
});
test('IPA and translations can be toggled independently without leaking English into source',()=>{
 const dom=setup('<p>Bonjour, mon ami.</p>'), w=dom.window, doc=w.document;
 const original=doc.body.textContent;
 w.FrenchIPAController.set({enabled:true,dictionary:'bonjour\t/bɔ̃ʒuʁ/\nmon\t/mɔ̃/\nami\t/ami/'});
 const plan=w.FrenchInterlinear.prepare('both');
 assert.ok(plan.tasks.some(t=>t.text==='Bonjour, mon ami.'));
 w.FrenchInterlinear.apply(answer(plan));
 w.FrenchIPAController.set({enabled:false});
 assert.equal(doc.querySelectorAll('.fripa-gloss').length,3);
 w.FrenchInterlinear.clear();assert.equal(doc.body.textContent,original);
 assert.equal(doc.querySelectorAll('.fripa-interlinear,.fripa-translation,rt').length,0);dom.window.close();
});
test('switching modes removes old annotations; cancellation/stale plans do not attach results',()=>{
 const dom=setup('<p>Bonjour ami.</p>'),w=dom.window,c=w.FrenchInterlinear;
 let plan=c.prepare('words');c.apply(answer(plan));assert.equal(w.document.querySelectorAll('.fripa-translation').length,0);
 plan=c.prepare('sentences');c.apply(answer(plan));assert.equal(w.document.querySelectorAll('.fripa-gloss').length,0);
 plan=c.prepare('both');c.clear();assert.equal(c.apply(answer(plan)).stale,true);
 plan=c.prepare('both');w.document.querySelector('p').textContent='Nouveau texte.';assert.equal(c.apply(answer(plan)).stale,true);dom.window.close();
});
test('skips code, forms, foreign sections and generated text; treats model output as plain text',()=>{
 const dom=setup('<p>Bonjour.</p><code>code</code><input value="input"><div contenteditable>edit</div><p lang="en">English</p>');
 const c=dom.window.FrenchInterlinear,plan=c.prepare('both');assert.equal(plan.words,1);assert.equal(plan.sentences,1);
 c.apply({generation:plan.generation,results:plan.tasks.map(t=>({id:t.id,text:'<img src=x onerror=alert(1)>'}))});
 assert.equal(dom.window.document.querySelectorAll('img').length,0);
 const next=c.prepare('both');assert.equal(next.words,1);dom.window.close();
});
test('translation tasks run sequentially, report progress and honor abort',async()=>{
 const dom=setup(''),w=dom.window;const translated=[];
 w.Translator={availability:async()=> 'available',create:async()=>({translate:async(text)=>{translated.push(text);return 'EN '+text;}})};
 w.eval(readFileSync('extension/translator.js','utf8'));
 await w.FrenchTranslator.create();const abort=new w.AbortController();
 await assert.rejects(()=>w.FrenchTranslator.translateTasks([{id:'0',text:'bonjour'},{id:'1',text:'ami'}],()=>abort.abort(),abort.signal),{name:'AbortError'});
 assert.deepEqual(translated,['bonjour']);dom.window.close();
});
test('unsupported browsers and model failures are reported without silent fallback',async()=>{
 const dom=setup(''),w=dom.window;w.eval(readFileSync('extension/translator.js','utf8'));
 assert.equal(await w.FrenchTranslator.availability(),'unsupported');
 await assert.rejects(()=>w.FrenchTranslator.create(),/requires a supported desktop Chrome/);
 w.Translator={create:async()=>{throw new Error('Model unavailable');}};
 await assert.rejects(()=>w.FrenchTranslator.create(),/Model unavailable/);
 w.Translator.create=async()=>({translate:async()=> 'hello'});
 await w.FrenchTranslator.create();
 const results=await w.FrenchTranslator.translateTasks([{id:'1',text:'bonjour'}],()=>{},new w.AbortController().signal);
 assert.equal(results[0].text,'hello');dom.window.close();
});
const dict='bonjour\t/bɔ̃ʒuʁ/\nmon\t/mɔ̃/\nami\t/ami/\nle\t/lə/\nsoleil\t/sɔlɛj/\nbrille\t/bʁij/';
function order(doc){
 // Visual reading order of each glossed word: French, IPA, English (top to bottom when IPA is below).
 return [...doc.querySelectorAll('.fripa-interlinear')].map(w=>[...w.querySelectorAll('.fripa-base,.fripa-ipa,.fripa-gloss')].map(n=>n.className.replace('fripa-','')).join('>'));
}
test('IPA below sits between the French word and its English gloss, whichever is applied first',()=>{
 for(const ipaFirst of [true,false]){
  const dom=setup('<p>Bonjour mon ami.</p>'),w=dom.window,doc=w.document;
  const ipa=()=>w.FrenchIPAController.set({enabled:true,position:'below',dictionary:dict});
  if(ipaFirst)ipa();
  const plan=w.FrenchInterlinear.prepare('words');w.FrenchInterlinear.apply(answer(plan));
  if(!ipaFirst)ipa();
  assert.deepEqual(order(doc),['base>ipa>gloss','base>ipa>gloss','base>ipa>gloss'],`ipaFirst=${ipaFirst}`);
  w.FrenchIPAController.set({enabled:true,position:'above'});
  assert.deepEqual(order(doc),['ipa>base>gloss','ipa>base>gloss','ipa>base>gloss']);
  w.FrenchInterlinear.clear();w.FrenchIPAController.set({enabled:false});
  assert.equal(doc.body.innerHTML,'<p>Bonjour mon ami.</p>');dom.window.close();
 }
});
test('sentences ignore source line breaks, break at <br> and nested blocks, and exclude IPA text',()=>{
 const dom=setup('<div>Le soleil\n   brille <em>fort</em> aujourd’hui.<br>Une ligne<p>Un bloc.</p>La suite.</div>'),w=dom.window;
 w.FrenchIPAController.set({enabled:true,dictionary:dict});
 const plan=w.FrenchInterlinear.prepare('sentences');
 assert.deepEqual(Array.from(plan.tasks,t=>t.text),['Le soleil brille fort aujourd’hui.','Une ligne','Un bloc.','La suite.']);dom.window.close();
});
test('sentence lines go after inline markup instead of splitting links or IPA words',()=>{
 const dom=setup('<p>Bonjour <a href="/x">mon ami.</a> Le soleil brille</p>'),w=dom.window,doc=w.document;
 w.FrenchIPAController.set({enabled:true,position:'below',dictionary:dict});
 const link=doc.querySelector('a'),plan=w.FrenchInterlinear.prepare('both');
 const result=w.FrenchInterlinear.apply(answer(plan));
 assert.equal(result.sentences,2);
 assert.equal(doc.querySelectorAll('a .fripa-translation,.fripa-word .fripa-translation,.fripa-interlinear .fripa-translation').length,0);
 const lines=[...doc.querySelectorAll('.fripa-translation')];
 assert.equal(lines[0].previousElementSibling,link);assert.equal(lines[0].parentElement,doc.querySelector('p'));
 assert.equal(lines[1].nextSibling,null);assert.equal(lines[1].textContent,'English: Le soleil brille');
 assert.equal(doc.querySelector('a'),link);
 w.FrenchInterlinear.clear();w.FrenchIPAController.set({enabled:false});
 assert.equal(doc.body.innerHTML,'<p>Bonjour <a href="/x">mon ami.</a> Le soleil brille</p>');dom.window.close();
});
test('a sentence that changes during translation is skipped without discarding the others',()=>{
 const dom=setup('<p>Bonjour mon ami.</p><p id="live">Il est midi.</p>'),w=dom.window,doc=w.document;
 const plan=w.FrenchInterlinear.prepare('sentences');doc.querySelector('#live').textContent='Il est treize heures.';
 const result=w.FrenchInterlinear.apply(answer(plan));
 assert.equal(result.stale,undefined);assert.equal(result.sentences,1);assert.equal(result.skipped,1);
 assert.equal(doc.querySelector('.fripa-translation').textContent,'English: Bonjour mon ami.');dom.window.close();
});
test('one failed translation is skipped; the run fails only when nothing translates',async()=>{
 const dom=setup(''),w=dom.window;
 w.Translator={create:async()=>({translate:async(text)=>{if(text==='bad')throw new Error('nope');return 'EN '+text;}})};
 w.eval(readFileSync('extension/translator.js','utf8'));await w.FrenchTranslator.create();
 const results=await w.FrenchTranslator.translateTasks([{id:'0',text:'bad'},{id:'1',text:'ami'}],()=>{},new w.AbortController().signal);
 assert.deepEqual(Array.from(results,r=>r.id),['1']);assert.equal(results.failed,1);
 await assert.rejects(()=>w.FrenchTranslator.translateTasks([{id:'0',text:'bad'}],()=>{},new w.AbortController().signal),/nope/);dom.window.close();
});
