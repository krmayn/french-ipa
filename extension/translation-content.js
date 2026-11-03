(() => {
  if (globalThis.FrenchInterlinear) return;
  const skip = 'script,style,noscript,textarea,input,select,option,pre,code,kbd,samp,svg,math,rt,.fripa-ipa,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[hidden],[aria-hidden="true"],[data-fripa-ignore],.fripa-gloss,.fripa-translation';
  const wordPattern = /\p{L}[\p{L}\p{M}]*(?:[’'][\p{L}\p{M}]+)*/gu;
  // Used only when computed style is unavailable (e.g. tests); live pages use computed display.
  const blockTags = new Set('ADDRESS ARTICLE ASIDE BLOCKQUOTE BODY CAPTION DD DETAILS DIALOG DIV DL DT FIELDSET FIGCAPTION FIGURE FOOTER FORM H1 H2 H3 H4 H5 H6 HEADER HGROUP HR LEGEND LI MAIN MENU NAV OL P SECTION SUMMARY TABLE TBODY TD TFOOT TH THEAD TR UL'.split(' '));
  // Extension wrappers are inline-block/block internally but belong to the inline flow.
  const ownInline = '.fripa-word,.fripa-word *,.fripa-interlinear';
  const MAX_WORDS = 2000, MAX_SENTENCES = 200, MAX_SENTENCE_CHARS = 4000;
  let generation = 0, pending;
  function visible(element) {
    return typeof element.checkVisibility !== 'function' || element.checkVisibility();
  }
  function eligible(node) {
    const p = node.parentElement;
    if (!p || p.closest(skip) || p.isContentEditable || !node.textContent.length) return false;
    const lang = p.closest('[lang]');
    if (lang && lang !== document.documentElement && lang.lang && !/^fr(?:-|$)/i.test(lang.lang)) return false;
    return visible(p);
  }
  function textNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode: n => eligible(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT});
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode); return nodes;
  }
  function isBlock(element, cache) {
    if (element === document.body || element === document.documentElement) return true;
    if (cache.has(element)) return cache.get(element);
    let block;
    if (element.matches(ownInline)) block = false;
    else {
      const display = getComputedStyle(element).display;
      block = display ? !/^(inline|contents|ruby|none)/.test(display) : blockTags.has(element.tagName);
    }
    cache.set(element, block);
    return block;
  }
  function blockOf(node, cache) {
    let element = node.parentElement;
    while (element && !isBlock(element, cache)) element = element.parentElement;
    return element || document.body;
  }
  // Split the page into runs of text that can hold a sentence: text inside one block, without a
  // nested block or <br> between. Inline markup (links, emphasis, IPA words) stays in the run.
  function sentenceRuns() {
    const cache = new Map(), runs = [];
    let run = null;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {acceptNode(node) {
      if (node.nodeType === Node.TEXT_NODE) return eligible(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      if (node.tagName === 'BR' || isBlock(node, cache)) run = null;
      return node.matches(skip) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
    }});
    while (walker.nextNode()) {
      const node = walker.currentNode, block = blockOf(node, cache);
      if (!run || run.block !== block) runs.push(run = {block, nodes: []});
      run.nodes.push(node);
    }
    return runs;
  }
  function clear() {
    generation++;
    pending = null;
    const parents = new Set();
    document.querySelectorAll('.fripa-translation,.fripa-gloss').forEach(n => { parents.add(n.parentNode); n.remove(); });
    document.querySelectorAll('.fripa-interlinear').forEach(n => { parents.add(n.parentNode); n.replaceWith(...n.childNodes); });
    // Rejoin the text nodes that placing translations split, so the page text is as it was.
    for (const parent of parents) if (parent?.isConnected) parent.normalize();
    return {generation};
  }
  function prepare(mode) {
    if (!['words','sentences','both'].includes(mode)) throw new Error('Choose a translation mode.');
    clear();
    const words = [], sentences = [], tasks = new Map(), originals = new Map();
    let limited = false;
    function task(text) {
      if (!tasks.has(text)) tasks.set(text, String(tasks.size));
      return tasks.get(text);
    }
    // Sentences are queued first so they are translated first.
    if (mode !== 'words') {
      const segmenter = new Intl.Segmenter('fr', {granularity: 'sentence'});
      outer: for (const run of sentenceRuns()) {
        // HTML source line breaks are just spaces when rendered, but the segmenter treats them as
        // paragraph breaks. Replace each whitespace character 1:1 so offsets still map to nodes.
        const text = run.nodes.map(n => n.textContent).join('').replace(/\s/g, ' ');
        if (!/\p{L}/u.test(text)) continue;
        for (const part of segmenter.segment(text)) {
          const source = part.segment.trim().replace(/ {2,}/g, ' ');
          if (!/\p{L}/u.test(source)) continue;
          if (source.length > MAX_SENTENCE_CHARS) { limited = true; continue; }
          if (sentences.length >= MAX_SENTENCES) { limited = true; break outer; }
          const start = part.index + (part.segment.length - part.segment.trimStart().length);
          const end = part.index + part.segment.trimEnd().length;
          const nodes = [];
          let offset = 0, anchor;
          for (const node of run.nodes) {
            const next = offset + node.length;
            if (next > start && offset < end) nodes.push(node);
            if (next >= end) { anchor = {node, offset: end - offset}; break; }
            offset = next;
          }
          if (!anchor) continue;
          for (const node of nodes) originals.set(node, node.textContent);
          sentences.push({...anchor, block: run.block, nodes, source, task: task(source)});
        }
      }
    }
    if (mode !== 'sentences') {
      for (const node of textNodes(document.body)) {
        const matches = [...node.textContent.matchAll(wordPattern)];
        if (words.length + matches.length > MAX_WORDS) { limited = true; break; }
        for (const m of matches) words.push({source: m[0], task: task(m[0])});
      }
    }
    pending = {generation, words, sentences, originals};
    return {generation, limited, words: words.length, sentences: sentences.length, tasks: [...tasks].map(([text, id]) => ({id, text}))};
  }
  // Place a sentence translation after the sentence without splitting page markup: if the
  // sentence ends inside a link, emphasis or IPA word, the line goes after that element.
  function placeLine(item, line) {
    let top = item.node;
    while (top.parentNode && top.parentNode !== item.block) top = top.parentNode;
    if (top.parentNode !== item.block) return false;
    if (top === item.node && item.offset < item.node.length) item.node.splitText(item.offset);
    top.after(line);
    return true;
  }
  function wrapWord(target, text) {
    const wrapper = document.createElement('span'); wrapper.className = 'fripa-interlinear';
    target.replaceWith(wrapper); wrapper.append(target);
    const gloss = document.createElement('span'); gloss.className = 'fripa-gloss'; gloss.lang = 'en'; gloss.dataset.fripaIgnore = '';
    gloss.textContent = text; gloss.title = 'Word translated in isolation; context may change the meaning.';
    wrapper.append(gloss);
  }
  function apply(batch) {
    if (!pending || batch.generation !== generation) return {stale: true};
    const answers = new Map(batch.results.map(r => [String(r.id), String(r.text).slice(0, 12000)]));
    // A sentence whose text changed or was removed during translation is skipped; the rest still
    // apply, so one dynamic widget on the page does not discard every translation.
    const fresh = pending.sentences.filter(item => answers.has(item.task) && item.block.isConnected &&
      item.nodes.every(node => node.isConnected && node.textContent === pending.originals.get(node) && blockOf(node, new Map()) === item.block));
    const skipped = pending.sentences.filter(item => answers.has(item.task)).length - fresh.length;
    if (skipped && !fresh.length && !pending.words.length) { clear(); return {stale: true}; }
    let sentenceCount = 0, wordCount = 0;
    // Validate everything before inserting, then insert from the end so earlier offsets stay valid.
    for (const item of fresh.reverse()) {
      const line = document.createElement('span'); line.className = 'fripa-translation'; line.lang = 'en';
      line.dataset.fripaIgnore = ''; line.textContent = answers.get(item.task);
      if (placeLine(item, line)) sentenceCount++;
    }
    const wordAnswers = new Map(pending.words.filter(w => answers.has(w.task)).map(w => [w.source, answers.get(w.task)]));
    if (wordAnswers.size) for (const node of textNodes(document.body)) {
      const ipaWord = node.parentElement.closest('.fripa-word');
      if (ipaWord) {
        // Wrap the whole IPA word so the order is French, IPA (above or below), then English.
        if (wordCount >= MAX_WORDS || ipaWord.parentElement.closest('.fripa-interlinear') || !wordAnswers.has(node.textContent)) continue;
        wrapWord(ipaWord, wordAnswers.get(node.textContent)); wordCount++;
        continue;
      }
      if (node.parentElement.closest('.fripa-interlinear')) continue;
      for (const match of [...node.textContent.matchAll(wordPattern)].reverse()) {
        if (!wordAnswers.has(match[0]) || wordCount >= MAX_WORDS) continue;
        // Matches run from the end, so splitting leaves earlier offsets in `node` valid.
        const word = node.splitText(match.index); word.splitText(match[0].length);
        wrapWord(word, wordAnswers.get(match[0])); wordCount++;
      }
    }
    if (pending.words.length && !wordCount && !sentenceCount && skipped) { clear(); return {stale: true}; }
    pending = null;
    return {words: wordCount, sentences: sentenceCount, skipped};
  }
  globalThis.FrenchInterlinear = {prepare, apply, clear};
})();
