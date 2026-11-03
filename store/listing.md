# Chrome Web Store listing

Name: French IPA

Summary: Read French with IPA and on-device English word glosses or sentence translations.

Category: Education (choose the matching available category)
Language: English

## Description

Read French web pages with IPA pronunciation next to the words and English underneath. Choose whether IPA appears above or below the text, and turn it off when you no longer need it.

French IPA includes an offline dictionary with more than 245,000 entries. Open a French page, click the extension, and choose Show IPA. The comparison page lets you try both layouts with your own French text and adjust the sample's text size.

Choose English translations to open the reading panel. Switch between word glosses, sentence translations, or both. Translation runs on your device using Chrome’s built-in model; Chrome may download a language pack first. Requires supported desktop Chrome 138 or later.

Features:
• English word glosses, sentence translations, or both
• IPA above or below French words
• Offline pronunciation lookup
• Support for accents, curly apostrophes and common elisions such as l’ami
• Annotations for newly added page text
• One-click removal of annotations
• No account, API key or tracking

Word glosses translate words in isolation and may miss the meaning in context. Sentence translations use the full sentence. Reapply translations after a page changes. Each run supports up to 2,000 words and 200 sentences.

Pronunciations are for French of France. Unknown words stay unchanged. When a word has multiple dictionary pronunciations, the extension shows the alternatives. It does not infer liaison or choose a pronunciation from sentence context.

Use it on French pages. Chrome settings, the Chrome Web Store, built-in PDFs, images, embedded frames and shadow DOM are not supported. Editable fields and code are skipped.

Source code and support: https://github.com/krmayn/french-ipa

## Single purpose

Help users read French through inline IPA pronunciation and English translations on the current page, at their request.

## Permission justifications

activeTab: Temporary access to the current tab after the user invokes the extension, to annotate the French text on that page. No persistent host access is requested.

scripting: Inject the packaged annotation scripts and styles into the active tab, change the IPA position, and remove the annotations when requested.

storage: Save the user's preferred IPA position and translation mode locally.

sidePanel: Keep translation controls open beside the source page while Chrome prepares the language model and translates the text.

Remote code: None. All extension code and IPA dictionary data are included in the extension package. Translation uses the browser-provided Translator API and its on-device model.

Data collection: None. Page text is processed transiently within the browser, without transmission or retention. Only layout and translation-mode preferences are saved locally.

Privacy policy: https://github.com/krmayn/french-ipa/blob/main/PRIVACY.md
Support: https://github.com/krmayn/french-ipa/issues
Homepage: https://github.com/krmayn/french-ipa

## Reviewer instructions

Open a regular French-language HTML page. Click French IPA in the extensions menu, then Show IPA on this page. Known words receive IPA. Choose Below to move the IPA, then Hide IPA to remove it. Open Compare both layouts to view the bundled sample, enter French text, and change the sample font size. For English, open English translations, select Both, enable translations, then click Translate this page. Chrome may need internet access to download the language model initially. The translation itself runs on device. No login or API key is required.
