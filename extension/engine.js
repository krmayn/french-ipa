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
  function annotateText(text, dict, doc, position) {
    const fragment = doc.createDocumentFragment();
    let last = 0, count = 0;
    for (const match of text.matchAll(token)) {
      const ipa = lookup(match[0], dict);
      if (!ipa) continue;
      fragment.append(text.slice(last, match.index));
      const ruby = doc.createElement('ruby');
      ruby.className = 'fripa-word';
      ruby.dataset.fripaPosition = position;
      ruby.append(doc.createTextNode(match[0]));
      const rt = doc.createElement('rt');
      rt.setAttribute('aria-hidden', 'true');
      rt.textContent = ipa.replaceAll('/', '');
      ruby.title = `${match[0]} ${ipa}`;
      ruby.append(rt);
      fragment.append(ruby);
      last = match.index + match[0].length;
      count++;
    }
    fragment.append(text.slice(last));
    return { fragment, count };
  }
  globalThis.FrenchIPA = { parse, lookup, annotateText };
})();
