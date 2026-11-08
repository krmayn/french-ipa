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
    // Read French context across inline markup and IPA wrappers, excluding annotations.
    const contextByNode = new Map(), blocks = new Map();
    for (const node of nodes) {
      const block = node.parentElement.closest('p,li,h1,h2,h3,h4,h5,h6,blockquote,td,th,figcaption,div,section,article,main,body');
      if (!blocks.has(block)) blocks.set(block, {text:''});
      const context = blocks.get(block);
      contextByNode.set(node, {context, offset:context.text.length});
      context.text += node.textContent;
    }
    function contextualGloss(node, match) {
      if (match[0].normalize('NFC').toLocaleLowerCase('fr') !== 'été') return null;
      const {context, offset} = contextByNode.get(node);
      const before = context.text.slice(0, offset + match.index).normalize('NFC').toLocaleLowerCase('fr');
      // Compound tenses: a été, n'ont jamais été, aurait déjà été, etc.
      const auxiliary = /(?:^|[^\p{L}\p{M}])(?:ai|as|a|avons|avez|ont|avais|avait|avions|aviez|avaient|eus|eut|eûmes|eûtes|eurent|aurai|auras|aura|aurons|aurez|auront|aurais|aurait|aurions|auriez|auraient|aie|aies|ait|ayons|ayez|aient|eusse|eusses|eût|eussions|eussiez|eussent|avoir|ayant)(?:\s+(?:pas|plus|jamais|déjà|toujours|souvent|rarement|bien|mal|encore|vraiment|probablement|certainement|peut-être|aussi|seulement|longtemps))*\s+$/u;
      return auxiliary.test(before) ? 'been' : null;
    }
    if (mode !== 'sentences') {
      for (const node of nodes) {
        const matches = [...node.textContent.matchAll(wordPattern)];
        if (words.length + matches.length > 2000) { limited = true; break; }
        for (const m of matches) words.push({node,start:m.index,end:m.index+m[0].length,source:m[0],gloss:contextualGloss(node,m),task:task(m[0])});
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
      for (const [block, group] of groups) {
        const text = group.map(n=>n.textContent).join('');
        if (!text.trim()) continue;
        for (const part of segmenter.segment(text)) {
          if (sentences.length >= 200) { limited = true; break; }
          const source = part.segment.trim();
          if (!source || source.length > 4000) { limited = true; continue; }
          sentences.push({block,source,task:task(source)});
        }
      }
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
    // Keep sentence translations outside word and IPA wrappers, below their paragraph.
    for (const item of pending.sentences) {
      if (!answers.has(item.task)) continue;
      const line = document.createElement('span'); line.className='fripa-translation'; line.lang='en';
      line.dataset.fripaIgnore=''; line.textContent=answers.get(item.task);
      line.title=item.source;
      item.block.append(line); sentenceCount++;
    }
    // Match occurrences in document order, so identical words can have different glosses.
    const occurrences = [];
    for (const node of textNodes(document.body)) {
      for (const match of node.textContent.matchAll(wordPattern)) occurrences.push({node,match});
    }
    for (let i = pending.words.length - 1; i >= 0; i--) {
      const word = pending.words[i], occurrence = occurrences[i];
      if (!occurrence || occurrence.match[0] !== word.source) continue;
      const answer = word.gloss ?? answers.get(word.task);
      if (answer == null) continue;
      const {node, match} = occurrence;
      const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
      const wrapper=document.createElement('span'); wrapper.className='fripa-interlinear';
      const ruby = node.parentElement.closest('ruby.fripa-word');
      const wholeIPAWord = ruby && node.parentElement === ruby && match.index === 0 && match[0] === node.textContent;
      if (wholeIPAWord) {
        ruby.replaceWith(wrapper);
        wrapper.append(ruby);
      } else {
        wrapper.append(range.extractContents());
        range.insertNode(wrapper);
      }
      const gloss=document.createElement('span');gloss.className='fripa-gloss';gloss.lang='en';gloss.dataset.fripaIgnore='';
      gloss.textContent=answer;
      gloss.title=word.gloss ? 'Meaning selected from the surrounding French grammar.' : 'Word translated in isolation; context may change the meaning.';
      wrapper.append(gloss);wordCount++;
    }
    pending = null;
    return {words:wordCount,sentences:sentenceCount};
  }
  globalThis.FrenchInterlinear={prepare,apply,clear};
})();
