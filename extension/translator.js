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
  // One failed text (for example a sentence the model rejects) is skipped instead of discarding
  // the whole run; the run fails only if nothing could be translated.
  async function translateTasks(tasks, onProgress, signal) {
    if (!translator) throw new Error('Enable English translations first.');
    const results=[];let firstError,done=0;
    for (const task of tasks) {
      if (signal.aborted) throw new DOMException('Translation cancelled.','AbortError');
      try {
        const text=await translator.translate(task.text,{signal});
        if (typeof text==='string' && text.trim()) results.push({id:task.id,text:text.trim()});
      } catch(error) {
        if (error?.name==='AbortError' || signal.aborted) throw new DOMException('Translation cancelled.','AbortError');
        firstError ||= error;
      }
      onProgress(++done,tasks.length);
    }
    if (!results.length && firstError) throw firstError;
    results.failed=tasks.length-results.length;
    return results;
  }
  globalThis.FrenchTranslator={availability,create,translateTasks};
})();
