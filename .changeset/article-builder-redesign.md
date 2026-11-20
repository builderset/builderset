---
'@builderset/engine': minor
'@builderset/article': minor
---

A new workspace design, first for the article builder.

- The frame: the panels sit on the page's background without borders; the canvas is an inset, rounded board with the page on it as a card, and a phone or tablet bezel on those screens.
- The top bar: back, the blocks panel, "Articles / title" with its state (Draft, Scheduled, Published, Published · edited), a saved dot, a search box that opens the command menu, history, preview, the split publish button and the settings panel.
- The dock: a floating toolbar at the foot of the canvas with undo and redo, the device, the zoom, words and reading time, the issues ("3 to check" or "Ready"), focus mode and the shortcuts. It replaces the status bar.
- The command menu (Ctrl K): every action, every heading to jump to and every block to insert, filtered as you type.
- Focus mode (Ctrl \\): both panels away, and back as they were.
- The left panel's tabs and the inspector's are segmented, with a pill that slides to the chosen tab. The block library has three tiles across, counts per category, recent blocks as chips and `/` to search.
- The inspector: "Document › Paragraph", the block's name and description with a close button; the Style tab's groups fold, and a setting with a few choices shows them all at once, "Auto" first.
- The article's document settings start with what to fix before publishing, each with a Fix that jumps to the block.
- The block toolbar on the canvas is light, like the rest of the workspace; the language switch is a bar over the canvas.
- New messages for all of it, in English, Albanian and German. New exports: `SegmentedTabs` from `/ui`; `ReadyCard`, `IssueList`, `useIssues`, `useJumpToIssue` and `LanguageBar` from `/editor`.
