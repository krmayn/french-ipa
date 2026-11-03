const examples={
 'Bonjour':'hello','Le':'the','soleil':'sun','brille':'shines','Les':'the','enfants':'children','jouent':'play','dans':'in','le':'the','jardin':'garden','J’aime':'I like','écouter':'to listen to','les':'the','histoires':'stories','de':'of','mon':'my','ami':'friend',
 'Bonjour !':'Hello!','Le soleil brille.':'The sun is shining.','Les enfants jouent dans le jardin.':'The children are playing in the garden.','J’aime écouter les histoires de mon ami.':'I like listening to my friend’s stories.'
};
let dictionary;
async function apply(){
 FrenchInterlinear.clear();FrenchIPAController.set({enabled:true,position:document.querySelector('#position').value,dictionary});
 const plan=FrenchInterlinear.prepare(document.querySelector('#mode').value);
 const missing=plan.tasks.filter(t=>!examples[t.text]);
 if(missing.length)throw new Error('Missing fixture: '+missing.map(t=>t.text));
 const result=FrenchInterlinear.apply({generation:plan.generation,results:plan.tasks.map(t=>({id:t.id,text:examples[t.text]}))});
 document.querySelector('#status').textContent=`${result.words} glosses · ${result.sentences} sentence translations`;
}
fetch('../extension/data/fr_FR.txt').then(r=>r.text()).then(text=>{dictionary=text;return apply();}).catch(e=>document.querySelector('#status').textContent=e.message);
document.querySelector('#apply').addEventListener('click',apply);
document.querySelector('#clear').addEventListener('click',()=>{FrenchInterlinear.clear();document.querySelector('#status').textContent='English removed';});
