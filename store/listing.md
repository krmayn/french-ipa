# Chrome Web Store listing

Name: French IPA

Summary: Read French with offline IPA above or below each word.

Category: Education (choose the matching available category)
Language: English

## Description

Read French web pages with IPA pronunciation next to the words. Choose whether IPA appears above or below the text, and turn it off when you no longer need it.

French IPA includes an offline dictionary with more than 245,000 entries. Open a French page, click the extension, and choose Show IPA. The comparison page lets you try both layouts with your own French text and adjust the sample's text size.

Features:
• IPA above or below French words
• Offline pronunciation lookup
• Support for accents, curly apostrophes and common elisions such as l’ami
• Annotations for newly added page text
• One-click removal of annotations
• No account, tracking or external service

Pronunciations are for French of France. Unknown words stay unchanged. When a word has multiple dictionary pronunciations, the extension shows the alternatives. It does not infer liaison or choose a pronunciation from sentence context.

Use it on French pages. Chrome settings, the Chrome Web Store, built-in PDFs, images, embedded frames and shadow DOM are not supported. Editable fields and code are skipped.

Source code and support: https://github.com/krmayn/french-ipa

## Single purpose

Display offline French IPA pronunciations above or below words on a web page at the user's request.

## Permission justifications

activeTab: Temporary access to the current tab after the user invokes the extension, to annotate the French text on that page. No persistent host access is requested.

scripting: Inject the packaged annotation scripts and styles into the active tab, change the IPA position, and remove the annotations when requested.

storage: Save the user's preferred IPA position locally so it is retained when the popup is reopened.

Remote code: None. All code and dictionary data are included in the extension package.

Data collection: None. Page text is processed transiently within the browser, without transmission or retention. Only the layout preference is saved locally.

Privacy policy: https://github.com/krmayn/french-ipa/blob/main/PRIVACY.md
Support: https://github.com/krmayn/french-ipa/issues
Homepage: https://github.com/krmayn/french-ipa

## Reviewer instructions

Open a regular French-language HTML page. Click French IPA in the extensions menu, then Show IPA on this page. Known words receive IPA. Choose Below to move the IPA, then Hide IPA to remove it. Open Compare both layouts to view the bundled sample, enter French text, and change the sample font size. No login or network service is required.
