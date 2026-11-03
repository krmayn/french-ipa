const mode = document.querySelector('#mode'), enable = document.querySelector('#enable'), translate = document.querySelector('#translate'), cancel = document.querySelector('#cancel'), clear = document.querySelector('#clear');
const modelStatus=document.querySelector('#model-status'), status=document.querySelector('#translation-status');
let controller, busy=false;
async function activeTab() {
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if (!tab?.id) throw new Error('Open a French web page first.');
  return tab.id;
}
async function call(tabId, method, arg) {
  const [result]=await chrome.scripting.executeScript({target:{tabId},func:(method,arg)=>globalThis.FrenchInterlinear[method](arg),args:[method,arg??null]});
  return result.result;
}
async function initialize(tabId) {
  await chrome.scripting.executeScript({target:{tabId},files:['translation-content.js']});
  await chrome.scripting.insertCSS({target:{tabId},files:['content.css']});
}
function setBusy(value) {busy=value;translate.disabled=value;mode.disabled=value;cancel.hidden=!value;}
function fail(error) {
  status.textContent = error.name==='AbortError' ? 'Translation cancelled. No new English lines were added.' : `Could not translate this page: ${error.message}. If page access was denied, click the extension icon on this tab and reopen English translations.`;
}
enable.addEventListener('click', async()=>{
  enable.disabled=true;
  try {
    await FrenchTranslator.create(percent=>{modelStatus.textContent=`Preparing English translations: ${percent}%`;});
    modelStatus.textContent='French → English is ready on this device.';enable.hidden=true;translate.disabled=false;
  } catch(error) {modelStatus.textContent=`Translation could not start: ${error.message}`;enable.disabled=false;}
});
translate.addEventListener('click',async()=>{
  setBusy(true);controller=new AbortController();const signal=controller.signal;
  try {
    const tabId=await activeTab();await initialize(tabId);
    const plan=await call(tabId,'prepare',mode.value);
    if (!plan.tasks.length) {status.textContent='No eligible French text found on this page.';return;}
    const results=await FrenchTranslator.translateTasks(plan.tasks,(done,total)=>{status.textContent=`Translating ${done} of ${total}…`;},signal);
    if(signal.aborted) throw new DOMException('Cancelled','AbortError');
    const result=await call(tabId,'apply',{generation:plan.generation,results});
    const notes=[];
    if(plan.limited) notes.push('Page limit reached; some text was skipped.');
    if(results.failed) notes.push(`${results.failed} could not be translated.`);
    if(result.skipped) notes.push(`${result.skipped} sentences changed on the page and were skipped.`);
    status.textContent=result.stale?'The page changed while translating. Click Translate this page again.':[`${result.words} word glosses · ${result.sentences} sentence translations`,...notes].join(' · ');
    await chrome.storage.local.set({translationMode:mode.value});
  }catch(error){fail(error);}finally{setBusy(false);}
});
cancel.addEventListener('click',()=>controller?.abort());
clear.addEventListener('click',async()=>{
  controller?.abort();
  try {const tabId=await activeTab();await initialize(tabId);await call(tabId,'clear');status.textContent='English removed. French and IPA are preserved.';}catch(error){fail(error);}
});
mode.addEventListener('change',()=>{status.textContent='Click Translate this page to apply this mode.';});
(async()=>{
  const saved=await chrome.storage.local.get({translationMode:'both'});if(['words','sentences','both'].includes(saved.translationMode)) mode.value=saved.translationMode;
  try {
    const available=await FrenchTranslator.availability();
    if(['unsupported','unavailable'].includes(available)){enable.textContent='Translation unavailable';modelStatus.textContent='This browser cannot run French–English translation. Use a supported desktop Chrome. IPA remains available.';return;}
    enable.textContent='Enable English translations';enable.disabled=false;
    modelStatus.textContent=available==='available'?'The language model is available.':'Chrome may download the language pack when you enable translations.';
  }catch(error){modelStatus.textContent=`Could not check translation support: ${error.message}`;enable.textContent='Try enabling translations';enable.disabled=false;}
})();
