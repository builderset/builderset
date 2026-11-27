---
'@builderset/engine': patch
'@builderset/email': patch
---

The canvas is the document, with nothing drawn around it.

- Engine: a page (an article) and a kit's whole page (an email) now fill the board — full width on desktop, top to bottom on every device, with no floating card, rounded corners, shadow or phone bezel around them. A tablet or a phone keeps its width, its edges a hairline. A kit that draws its own page reads the board's height and the room to leave for the dock as `--bld-page-min` and `--bld-page-end`. Kits that draw their own card (a form) or their own artboard (a card, a popup) are unchanged.
- Email: the inbox header over the canvas — sender, recipient, subject and preheader — is gone; the email starts at the top of the work area and its backdrop runs to the bottom. The subject, the preheader and the inbox preview stay in the settings.
