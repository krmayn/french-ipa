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
