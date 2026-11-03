(() => {
  if (globalThis.FrenchIPAController) return;
  let enabled = false, position = 'above', dictionary, observer, timer;
  const skip = '.fripa-word,.fripa-gloss,.fripa-translation,script,style,noscript,textarea,input,select,option,pre,code,kbd,samp,svg,math,ruby,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[hidden],[aria-hidden="true"],[data-fripa-ignore]';
  function eligible(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest(skip) || parent.isContentEditable || !node.textContent.trim()) return false;
    const language = parent.closest('[lang]');
    if (language && language !== document.documentElement && language.lang && !/^fr(?:-|$)/i.test(language.lang)) return false;
    return true;
  }
  function scan() {
    if (!enabled || !document.body) return;
    observer?.disconnect();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: node => eligible(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const result = FrenchIPA.annotateText(node.textContent, dictionary, document, position);
      if (result.count) node.replaceWith(result.fragment);
    }
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  // Register the bundled IPA font on the page. The popup passes its bytes (like the dictionary), so
  // no web-accessible resource is exposed and page CSP font-src rules do not apply to it.
  let fontAdded = false;
  function addFont(base64) {
    if (fontAdded || !base64 || typeof FontFace !== 'function' || !document.fonts) return;
    try {
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      document.fonts.add(new FontFace('French IPA Phonetic', bytes.buffer, { style: 'normal', weight: '400' }));
      fontAdded = true;
    } catch { /* Fall back to the system fonts listed in content.css. */ }
  }
  function state() { return { enabled, position, count: document.querySelectorAll('.fripa-word').length }; }
  function set(options) {
    clearTimeout(timer);
    position = options.position === 'below' ? 'below' : 'above';
    enabled = !!options.enabled;
    if (enabled) {
      if (options.dictionary) dictionary = FrenchIPA.parse(options.dictionary);
      addFont(options.font);
      if (!dictionary) { enabled = false; throw new Error('Dictionary is not loaded. Please try again.'); }
      observer ||= new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(scan, 150); });
      document.querySelectorAll('.fripa-word').forEach(node => FrenchIPA.setPosition(node, position));
      scan();
    } else {
      observer?.disconnect();
      document.querySelectorAll('.fripa-word').forEach(node => {
        const parent = node.parentNode;
        FrenchIPA.removeWord(node);
        parent.normalize();
      });
    }
    return state();
  }
  globalThis.FrenchIPAController = { set, state };
})();
