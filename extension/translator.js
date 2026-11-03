(() => {
  if (globalThis.FrenchTranslator) return;
  let translator, creating;
  async function availability() {
    if (!globalThis.Translator) return 'unsupported';
    return Translator.availability({sourceLanguage:'fr',targetLanguage:'en'});
  }
  // Call directly from a button handler to retain Chrome's user activation.
  function create(onProgress = () => {}) {
    if (translator) return Promise.resolve(translator);
    if (creating) return creating;
    if (!globalThis.Translator) return Promise.reject(new Error('On-device translation requires a supported desktop Chrome with the Translator API. IPA still works.'));
    creating = Translator.create({sourceLanguage:'fr',targetLanguage:'en',monitor(m) {
      m.addEventListener('downloadprogress',e=>onProgress(Math.round(e.loaded*100)));
    }}).then(value=>{translator=value;return value;}).finally(()=>{creating=null;});
    return creating;
  }
  async function translateTasks(tasks, onProgress, signal) {
    if (!translator) throw new Error('Enable English translations first.');
    const results=[];
    for (const task of tasks) {
      if (signal.aborted) throw new DOMException('Translation cancelled.','AbortError');
      const text=await translator.translate(task.text,{signal});
      results.push({id:task.id,text});onProgress(results.length,tasks.length);
    }
    return results;
  }
  globalThis.FrenchTranslator={availability,create,translateTasks};
})();
