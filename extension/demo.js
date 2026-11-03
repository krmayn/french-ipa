const status=document.querySelector('#status'),button=document.querySelector('#translate');
let dictionary,abort;
fetch('data/fr_FR.txt').then(r=>r.text()).then(text=>{dictionary=text;FrenchIPAController.set({enabled:true,position:'above',dictionary});});
FrenchTranslator.availability().then(s=>{status.textContent=['unsupported','unavailable'].includes(s)?'On-device translation is unavailable in this browser. IPA still works.':'Ready. Click Enable and translate to prepare the French–English model.';});
document.querySelector('#position').addEventListener('change',e=>FrenchIPAController.set({enabled:true,position:e.target.value,dictionary}));
document.querySelector('#clear').addEventListener('click',()=>{abort?.abort();FrenchInterlinear.clear();status.textContent='English removed.';});
button.addEventListener('click',async()=>{
 button.disabled=true;abort=new AbortController();
 try {
  await FrenchTranslator.create(p=>{status.textContent=`Preparing translation model: ${p}%`;});
  const plan=FrenchInterlinear.prepare(document.querySelector('#mode').value);
  const results=await FrenchTranslator.translateTasks(plan.tasks,(done,total)=>{status.textContent=`Translating ${done} of ${total}…`;},abort.signal);
  if(abort.signal.aborted) return;
  const result=FrenchInterlinear.apply({generation:plan.generation,results});
  status.textContent=result.stale?'Page changed; try again.':`${result.words} word glosses · ${result.sentences} sentence translations`;
 }catch(error){status.textContent=`Translation unavailable: ${error.message}`;}finally{button.disabled=false;}
});
