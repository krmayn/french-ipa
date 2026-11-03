(() => {
  if (globalThis.FrenchIPA) return;
  const token = /\p{L}[\p{L}\p{M}]*(?:[’'][\p{L}\p{M}]+)*/gu;
  const elisions = { l:'l', d:'d', j:'ʒ', t:'t', m:'m', n:'n', s:'s', c:'s', qu:'k', jusqu:'ʒysk', lorsqu:'lɔʁsk', puisqu:'pɥisk' };
  const normalize = word => word.normalize('NFC').toLocaleLowerCase('fr').replaceAll('’', "'");
  function parse(text) {
    const dict = new Map();
    for (const line of text.split('\n')) {
      const [word, ipa] = line.trim().split('\t');
      if (word && ipa) dict.set(normalize(word), ipa);
    }
    return dict;
  }
  function lookup(word, dict) {
    const key = normalize(word);
    if (dict.has(key)) return dict.get(key);
    const split = key.indexOf("'");
    if (split > 0 && Object.hasOwn(elisions, key.slice(0, split))) {
      const tail = lookup(key.slice(split + 1), dict);
      if (tail) return tail.split(',').map(p => '/' + elisions[key.slice(0, split)] + p.trim().replace(/^\/|\/$/g, '') + '/').join(', ');
    }
    return null;
  }
  // Each word is an inline-block with two block lines (IPA and the French word) instead of
  // <ruby>/<rt>, so the extension, not UA ruby rules or page `rt` styles, controls the IPA font,
  // size and line spacing (see content.css for the tilde fix). It also lets a word gloss wrap the
  // whole word, keeping IPA between French and English when IPA is below. DOM order follows the
  // visual order so CSS baseline-source keeps the French word on the page baseline.
  function setPosition(word, position) {
    const below = position === 'below';
    word.dataset.fripaPosition = below ? 'below' : 'above';
    const ipa = word.querySelector(':scope > .fripa-ipa'), base = word.querySelector(':scope > .fripa-base');
    if (ipa && base) below ? base.after(ipa) : base.before(ipa);
  }
  function annotateText(text, dict, doc, position) {
    const fragment = doc.createDocumentFragment();
    let last = 0, count = 0;
    for (const match of text.matchAll(token)) {
      const ipa = lookup(match[0], dict);
      if (!ipa) continue;
      if (match.index > last) fragment.append(text.slice(last, match.index));
      const word = doc.createElement('span');
      word.className = 'fripa-word';
      word.title = `${match[0]} ${ipa}`;
      const base = doc.createElement('span');
      base.className = 'fripa-base';
      base.append(doc.createTextNode(match[0]));
      const mark = doc.createElement('span');
      mark.className = 'fripa-ipa';
      mark.setAttribute('aria-hidden', 'true');
      mark.lang = 'fr-fonipa';
      mark.setAttribute('translate', 'no');
      mark.textContent = ipa.replaceAll('/', '').normalize('NFC');
      word.append(mark, base);
      setPosition(word, position);
      fragment.append(word);
      last = match.index + match[0].length;
      count++;
    }
    if (last < text.length) fragment.append(text.slice(last));
    return { fragment, count };
  }
  function removeWord(word) {
    const base = word.querySelector(':scope > .fripa-base');
    word.replaceWith(...(base ? base.childNodes : []));
  }
  globalThis.FrenchIPA = { parse, lookup, annotateText, setPosition, removeWord };
})();
