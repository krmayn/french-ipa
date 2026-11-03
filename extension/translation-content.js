(() => {
  if (globalThis.FrenchInterlinear) return;
  const skip = 'script,style,noscript,textarea,input,select,option,pre,code,kbd,samp,svg,math,rt,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[hidden],[aria-hidden="true"],[data-fripa-ignore],.fripa-gloss,.fripa-translation';
  const wordPattern = /\p{L}[\p{L}\p{M}]*(?:[’'][\p{L}\p{M}]+)*/gu;
  let generation = 0, pending;
  function eligible(node) {
    const p = node.parentElement;
    if (!p || p.closest(skip) || p.isContentEditable || !node.textContent.length) return false;
    const lang = p.closest('[lang]');
    return !(lang && lang !== document.documentElement && lang.lang && !/^fr(?:-|$)/i.test(lang.lang));
  }
  function textNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode: n => eligible(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT});
    const nodes = []; while(walker.nextNode()) nodes.push(walker.currentNode); return nodes;
  }
  function clear() {
    generation++;
    pending = null;
    document.querySelectorAll('.fripa-translation,.fripa-gloss').forEach(n => n.remove());
    document.querySelectorAll('.fripa-interlinear').forEach(n => n.replaceWith(...n.childNodes));
    return {generation};
  }
  function prepare(mode) {
    if (!['words','sentences','both'].includes(mode)) throw new Error('Choose a translation mode.');
    clear();
    const nodes = textNodes(document.body);
    const words = [], sentences = [], tasks = new Map();
    let limited = false;
    function task(text) {
      if (!tasks.has(text)) tasks.set(text, String(tasks.size));
      return tasks.get(text);
    }
    if (mode !== 'sentences') {
      for (const node of nodes) {
        const matches = [...node.textContent.matchAll(wordPattern)];
        if (words.length + matches.length > 2000) { limited = true; break; }
        for (const m of matches) words.push({node,start:m.index,end:m.index+m[0].length,source:m[0],task:task(m[0])});
      }
    }
    if (mode !== 'words') {
      const groups = new Map();
      for (const node of nodes) {
        const block = node.parentElement.closest('p,li,h1,h2,h3,h4,h5,h6,blockquote,td,th,figcaption,div,section,article,main,body');
        if (!block) continue;
        if (!groups.has(block)) groups.set(block, []);
        groups.get(block).push(node);
      }
      const segmenter = new Intl.Segmenter('fr',{granularity:'sentence'});
      for (const group of groups.values()) {
        const text = group.map(n=>n.textContent).join('');
        if (!text.trim()) continue;
        for (const part of segmenter.segment(text)) {
          if (sentences.length >= 200) { limited = true; break; }
          const source = part.segment.trim();
          if (!source || source.length > 4000) { limited = true; continue; }
          const end = part.index + part.segment.trimEnd().length;
          let offset = 0;
          for (const node of group) {
            if (offset + node.length >= end) {
              sentences.push({node,offset:end-offset,source,task:task(source)}); break;
            }
            offset += node.length;
          }
        }
      }
    }
    // Live ranges keep sentence anchors valid when word annotations split text nodes.
    for (const item of sentences) {
      item.range = document.createRange(); item.range.setStart(item.node,item.offset); item.range.collapse(true);
    }
    pending = {generation, words, sentences, originals:new Map(nodes.map(n=>[n,n.textContent]))};
    return {generation, limited, words:words.length, sentences:sentences.length, tasks:[...tasks].map(([text,id])=>({id,text}))};
  }
  function apply(batch) {
    if (!pending || batch.generation !== generation) return {stale:true};
    // Reject a changed page rather than attaching an old translation to new text.
    for (const [node,text] of pending.originals) if (!node.isConnected || node.textContent !== text) { clear(); return {stale:true}; }
    const answers = new Map(batch.results.map(r=>[String(r.id),String(r.text).slice(0,12000)]));
    let sentenceCount = 0, wordCount = 0;
    // Insert sentence lines first, from the end; original source nodes and inline elements survive.
    for (const item of [...pending.sentences].reverse()) {
      if (!answers.has(item.task)) continue;
      const line = document.createElement('span'); line.className='fripa-translation'; line.lang='en';
      line.dataset.fripaIgnore=''; line.textContent=answers.get(item.task);
      item.range.insertNode(line); sentenceCount++;
    }
    // Rewalk after range insertions because they split text nodes. Match by source token.
    const wordAnswers = new Map(pending.words.filter(w=>answers.has(w.task)).map(w=>[w.source,answers.get(w.task)]));
    if (pending.words.length) for (const node of textNodes(document.body)) {
      const matches=[...node.textContent.matchAll(wordPattern)];
      for (const match of matches.reverse()) {
        if (!wordAnswers.has(match[0]) || wordCount >= 2000) continue;
        const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
        const wrapper=document.createElement('span'); wrapper.className='fripa-interlinear';
        wrapper.append(range.extractContents());
        const gloss=document.createElement('span');gloss.className='fripa-gloss';gloss.lang='en';gloss.dataset.fripaIgnore='';
        gloss.textContent=wordAnswers.get(match[0]);gloss.title='Word translated in isolation; context may change the meaning.';
        wrapper.append(gloss);range.insertNode(wrapper);wordCount++;
      }
    }
    pending = null;
    return {words:wordCount,sentences:sentenceCount};
  }
  globalThis.FrenchInterlinear={prepare,apply,clear};
})();
