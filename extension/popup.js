const button = document.querySelector('#toggle');
const status = document.querySelector('#status');
let tabId, current = { enabled: false, position: 'above' };
function render() {
  document.querySelector(`input[value="${current.position}"]`).checked = true;
  document.querySelectorAll('.fripa-word').forEach(node => node.dataset.fripaPosition = current.position);
  button.textContent = current.enabled ? 'Hide IPA on this page' : 'Show IPA on this page';
  status.textContent = current.enabled ? `${current.count} words annotated` : 'Ready for this page';
}
async function apply(enabled) {
  button.disabled = true;
  try {
    const options = { enabled, position: current.position };
    if (enabled) options.dictionary = await (await fetch('data/fr_FR.txt')).text();
    const [result] = await chrome.scripting.executeScript({ target: { tabId }, func: options => globalThis.FrenchIPAController.set(options), args: [options] });
    current = result.result;
    await chrome.storage.local.set({ position: current.position });
    render();
  } catch (error) { status.textContent = 'Could not update this page. Reload it and try again.'; }
  finally { button.disabled = false; }
}
button.addEventListener('click', () => apply(!current.enabled));
document.querySelectorAll('input[name="position"]').forEach(input => input.addEventListener('change', async () => {
  current.position = input.value;
  render();
  await chrome.storage.local.set({ position: current.position });
  if (current.enabled) await apply(true);
}));
(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab.id;
    const saved = await chrome.storage.local.get({ position: 'above' });
    await chrome.scripting.executeScript({ target: { tabId }, files: ['engine.js', 'content.js'] });
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['content.css'] });
    const [result] = await chrome.scripting.executeScript({ target: { tabId }, func: () => globalThis.FrenchIPAController.state() });
    current = result.result;
    if (!current.enabled) current.position = saved.position === 'below' ? 'below' : 'above';
    render(); button.disabled = false;
  } catch {
    button.textContent = 'Open a regular web page';
    status.textContent = 'Chrome settings, the Web Store and built-in PDF pages cannot be annotated.';
  }
})();

document.querySelector('#translations').addEventListener('click', async () => {
  try { await chrome.sidePanel.open({tabId}); window.close(); }
  catch { status.textContent='Open a regular web page, then reopen the extension to use English translations.'; }
});
