let dict;
function update() {
  if (!dict) return;
  for (const position of ['above', 'below']) {
    const result = FrenchIPA.annotateText(document.querySelector('#text').value, dict, document, position);
    document.getElementById(position).replaceChildren(result.fragment);
    document.querySelector('#status').textContent = `${result.count} words annotated · ${dict.size.toLocaleString()} dictionary entries · works offline`;
  }
}
document.querySelector('#update').addEventListener('click', update);
document.querySelector('#size').addEventListener('input', event => document.querySelectorAll('.reading').forEach(node => node.style.fontSize = event.target.value + 'px'));
fetch('data/fr_FR.txt').then(r => { if (!r.ok) throw new Error(); return r.text(); }).then(text => { dict = FrenchIPA.parse(text); update(); }).catch(() => { document.querySelector('#status').textContent = 'Could not load the dictionary. Open this preview from the extension or a local web server.'; });
