# French IPA

A Chrome extension that places IPA **above or below French words** and adds **English word glosses, sentence translations, or both**. IPA comes from a bundled dictionary. Translation uses Chrome’s on-device Translator API; page text is not sent to a server.

![The same French passage with IPA above and below](docs/comparison.png)

## Install

1. Download `french-ipa-0.2.0.zip` from [Releases](../../releases/latest) and extract it.
2. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
3. Select the extracted folder containing `manifest.json`.
4. Open a French web page, click **French IPA** in the extensions menu, and choose **Show IPA on this page**.
5. Switch between **Above** and **Below**, or open **Compare both layouts** to try your own text.

For a source checkout, load the `extension/` directory instead. No build step is required. This is an unpacked extension, not a Chrome Web Store listing.

## Translation verification status

Version 0.2.0 is a preview release. Annotation behavior passes automated tests, and layout was checked in Chrome using explicitly labeled fixed example translations. The live French–English model failed to initialize in the development Chrome session, so successful end-to-end model translation and the extension side-panel flow remain unverified. The UI reports model failure without sending text to another service.

## English translations

Open the extension on a French page, choose **English translations**, and keep the side panel open. Choose **Word glosses**, **Sentence translations**, or **Both**. Click **Enable English translations**, then **Translate this page**. **Remove English** keeps the French and IPA.

Requires desktop Chrome 138+ with the Translator API available. Chrome may download a French–English language pack on first use. Unsupported browsers show an explanation; IPA continues to work. No API key is needed. Word glosses translate words in isolation and can be wrong in context. Sentence mode uses complete sentences, including text across inline markup such as links and emphasis; line breaks in the page source are ignored, while `<br>` and nested blocks end a sentence. Each English line is placed after the sentence without splitting links or other page elements; if a sentence ends inside one, the line follows that element. Layout and punctuation on unusual pages can affect sentence boundaries.

Translations are applied on request, up to 2,000 word occurrences and 200 sentences (4,000 characters each) per run. Limits are shown in the panel. Reapply after dynamic page changes. Sentences are translated before word glosses. A text the model cannot translate is skipped and counted in the panel. Cancel stops pending work; sentences that change while translating are skipped rather than attached to the new text. Reapplying or switching modes replaces prior English annotations.

Use **Try interlinear reading** in the popup for a live example with both IPA positions.

## Behavior

- Manual activation on the current tab; refresh resets activation. The preferred IPA position is saved.
- French of France dictionary, including inflected forms. Unknown words remain unchanged.
- Curly apostrophes, Unicode accents and common elisions such as `l’ami` are supported.
- IPA is drawn in a bundled phonetic font (a small Charis SIL subset) so nasal tildes in ɔ̃ ɑ̃ ɛ̃ œ̃ sit on their letters regardless of the fonts installed on the computer. Each word is an inline block with the IPA line above or below it; the French word stays on the line’s baseline.
- With word glosses shown, the order is always IPA, French, English (IPA above) or French, IPA, English (IPA below).
- Multiple dictionary pronunciations are shown together. The extension does not choose a meaning or infer liaison, enchaînement or sentence rhythm.
- Dynamically added text is annotated while enabled. Hiding IPA restores the text and keeps existing links and elements.
- Forms, editable regions, code, existing ruby, and explicitly tagged non-French sections are skipped.
- Activation treats the main page as French, even if its root language tag is missing or incorrect. It is not automatic language detection, so use it on French pages.
- Scanned text is in the main document, not iframes, shadow DOM, images or PDFs. Chrome settings and the Chrome Web Store cannot be annotated.
- Complex sites that continuously rebuild their own text may conflict with annotation. Turn IPA off if a page behaves unexpectedly.

## Privacy and permissions

Only `activeTab`, `scripting`, `storage`, and `sidePanel` are requested. There are no broad host permissions, accounts, analytics or remote scripts. The IPA dictionary is bundled. Chrome manages the initial translation-model download; subsequent translation runs locally. `activeTab` gives temporary access when the extension is invoked; `storage` saves layout and translation-mode preferences locally. `sidePanel` keeps translation controls open during model setup and translation.

## Develop and test

```sh
npm ci
npm test
npm run package
```

For the comparison page:

```sh
python3 -m http.server 8768 --bind 127.0.0.1 --directory extension
# Visit http://127.0.0.1:8768/preview.html
```

Optional isolated Chromium checks (with the server running):

```sh
npx playwright install chromium
node scripts/browser-check.cjs
```

The browser check covers IPA placement, baseline alignment, the bundled IPA font, mobile fit, editable preview text, extension loading and restricted-page feedback. DOM tests cover dictionary lookup, elisions, exclusion rules, restoration, duplicate prevention and live updates. Toolbar-click activation still needs a manual smoke test in a normal Chrome profile.

## Dictionary and license

French data: [open-dict-data/ipa-dict](https://github.com/open-dict-data/ipa-dict), `data/fr_FR.txt`. Its MIT notice is included in `extension/data/LICENSE`; source provenance is recorded in `extension/data/SOURCE.md`. The dictionary is a reading aid and may contain omissions or errors.

IPA font: `extension/fonts/french-ipa-phonetic.woff2`, a renamed subset of Charis SIL by SIL International under the SIL Open Font License 1.1 (`extension/fonts/OFL.txt`; details in `extension/fonts/SOURCE.md`).

Extension code is MIT licensed. See [LICENSE](LICENSE).
