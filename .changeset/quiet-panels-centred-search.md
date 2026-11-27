---
'@builderset/engine': patch
'@builderset/email': patch
'@builderset/article': patch
'@builderset/form': patch
'@builderset/card': patch
'@builderset/popup': patch
---

The editors' chrome, calmer: the command search sits at the exact centre of the top bar (a field once the bar is wide enough, its icon below; the bar sizes its contents by its own width, not the window's); the template gallery lists its categories under their headings without the filter chips; and an empty list in a side panel (saved sections, saved modules) is one quiet row — an icon tile and its sentence on a dashed card — through `EmptyState`'s new `size="inline"`. An `EmptyState` with a title of its own no longer adds the "Try changing the filters" hint under it.

The side drawers (history, shortcuts, scheduling) get a real header: an icon tile, the title with a line under it, and the close button in the same row, inside the panel — the overlay bands' rule had taken the header's padding, so the title sat on the panel's edge. History lists the versions under their days ("Today", "Yesterday", "Tue, 3 Oct"), each with its time, its author's initials and, for a named version, its kind; the "Save as version" field is a band under the header that stays put while the list scrolls.
