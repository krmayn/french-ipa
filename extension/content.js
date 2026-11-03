(() => {
  if (globalThis.FrenchIPAController) return;
  let enabled = false, position = 'above', dictionary, observer, timer;
  const skip = 'script,style,noscript,textarea,input,select,option,pre,code,kbd,samp,svg,math,ruby,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[hidden],[aria-hidden="true"],[data-fripa-ignore]';
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
  function state() { return { enabled, position, count: document.querySelectorAll('ruby.fripa-word').length }; }
  function set(options) {
    clearTimeout(timer);
    position = options.position === 'below' ? 'below' : 'above';
    enabled = !!options.enabled;
    if (enabled) {
      if (options.dictionary) dictionary = FrenchIPA.parse(options.dictionary);
      if (!dictionary) { enabled = false; throw new Error('Dictionary is not loaded. Please try again.'); }
      observer ||= new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(scan, 150); });
      document.querySelectorAll('ruby.fripa-word').forEach(node => { node.dataset.fripaPosition = position; });
      scan();
    } else {
      observer?.disconnect();
      document.querySelectorAll('ruby.fripa-word').forEach(node => {
        const parent = node.parentNode;
        const text = [...node.childNodes].filter(child => child.nodeName !== 'RT').map(child => child.textContent).join('');
        node.replaceWith(document.createTextNode(text));
        parent.normalize();
      });
    }
    return state();
  }
  globalThis.FrenchIPAController = { set, state };
})();
