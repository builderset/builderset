/**
 * The editor's own words, in the three languages the back office speaks.
 *
 * Kept in the package rather than in the host's catalogue: every host of the
 * builder would otherwise have to ship the same two hundred strings, and a
 * missing one would surface as a raw key on the canvas. A host can still
 * override any of them through `messages`.
 */

export interface ElementText {
  name: string;
  description: string;
}

export interface EditorMessages {
  back: string;
  untitled: string;
  undo: string;
  redo: string;
  nothingToUndo: string;
  nothingToRedo: string;
  desktop: string;
  tablet: string;
  mobile: string;
  zoom: string;
  zoomFit: string;
  preview: string;
  publish: string;
  update: string;
  schedule: string;
  saveDraft: string;
  unpublish: string;
  duplicateArticle: string;
  deleteArticle: string;
  status_draft: string;
  status_published: string;
  status_archived: string;
  status_scheduled: string;
  saveIdle: string;
  saveDirty: string;
  saveSaving: string;
  saveSaved: string;
  saveError: string;
  saveConflict: string;
  savedAgo: (when: string) => string;
  justNow: string;
  minutesAgo: (minutes: number) => string;
  hoursAgo: (hours: number) => string;
  add: string;
  layers: string;
  templates: string;
  settings: string;
  searchElements: string;
  noElementsFound: string;
  recentlyUsed: string;
  categories: Record<string, string>;
  content: string;
  style: string;
  advanced: string;
  document: string;
  general: string;
  seo: string;
  publishing: string;
  nothingSelected: string;
  multipleSelected: (count: number) => string;
  moveUp: string;
  moveDown: string;
  duplicate: string;
  delete: string;
  selectParent: string;
  insertHere: string;
  insertAfter: string;
  turnInto: string;
  hide: string;
  show: string;
  lock: string;
  unlock: string;
  rename: string;
  anchor: string;
  anchorHint: string;
  elementName: string;
  hidden: string;
  hiddenHint: string;
  locked: string;
  lockedHint: string;
  breakpoint: string;
  inherited: string;
  reset: string;
  spacing: string;
  layout: string;
  appearance: string;
  typography: string;
  visibility: string;
  hideAt: string;
  styleKeys: Record<string, string>;
  addItem: string;
  removeItem: string;
  clear: string;
  none: string;
  upload: string;
  replace: string;
  uploading: string;
  uploadFailed: string;
  chooseImage: string;
  emptyTitle: string;
  emptyBody: string;
  startWriting: string;
  words: (count: number) => string;
  readingTime: (minutes: number) => string;
  issues: (count: number) => string;
  noIssues: string;
  jumpTo: string;
  publishBlocked: string;
  shortcuts: string;
  shortcutList: [string, string][];
  title: string;
  slug: string;
  slugFrozen: string;
  excerpt: string;
  category: string;
  cover: string;
  coverAlt: string;
  seoTitle: string;
  seoDescription: string;
  canonical: string;
  noindex: string;
  noindexHint: string;
  focusKeyword: string;
  featured: string;
  featuredHint: string;
  readingMinutes: string;
  readingMinutesHint: string;
  publishAt: string;
  scheduleHint: string;
  cancel: string;
  confirm: string;
  leaveTitle: string;
  leaveBody: string;
  leave: string;
  stay: string;
  conflictTitle: string;
  conflictBody: string;
  keepMine: string;
  loadTheirs: string;
  restoreTitle: string;
  restoreBody: string;
  restore: string;
  discard: string;
  revisions: string;
  noRevisions: string;
  revisionKinds: Record<string, string>;
  restoreRevision: string;
  saveVersion: string;
  savedSections: string;
  sectionName: string;
  saveSection: string;
  noSections: string;
  dragToMove: string;
  moreOptions: string;
  close: string;
  versionLabel: string;
  saved: string;
  published: string;
  scheduled: string;
  unpublished: string;
  deleteTitle: string;
  deleteBody: string;
  cannotPlace: string;
  elements: Record<string, ElementText>;
  issueText: Record<string, string>;
  fieldLabels: Record<string, string>;
}

const EN_ELEMENTS: Record<string, ElementText> = {
  section: { name: 'Section', description: 'A full-width band with its own background' },
  container: { name: 'Container', description: 'Groups blocks at a set width' },
  columns: { name: 'Columns', description: 'Two to four columns side by side' },
  column: { name: 'Column', description: 'One column of a columns block' },
  group: { name: 'Group', description: 'Keeps blocks together, e.g. to style them' },
  spacer: { name: 'Spacer', description: 'Empty vertical space' },
  divider: { name: 'Divider', description: 'A line between parts of the article' },
  heading: { name: 'Heading', description: 'A section title (H2–H4)' },
  paragraph: { name: 'Paragraph', description: 'Body text' },
  list: { name: 'List', description: 'Bulleted, numbered or checklist' },
  quote: { name: 'Quote', description: 'A quotation with its source' },
  'pull-quote': { name: 'Pull quote', description: 'A line from the article, set large' },
  callout: { name: 'Callout', description: 'A tip, note or warning box' },
  code: { name: 'Code', description: 'Code with syntax highlighting' },
  table: { name: 'Table', description: 'Rows and columns of data' },
  footnote: { name: 'Footnote', description: 'A numbered note at the end' },
  takeaways: { name: 'Key takeaways', description: 'The article in a few points' },
  definitions: { name: 'Definitions', description: 'Terms and what they mean' },
  image: { name: 'Image', description: 'A picture with caption' },
  gallery: { name: 'Gallery', description: 'Several pictures as a grid or carousel' },
  'before-after': { name: 'Before / after', description: 'Two pictures with a slider' },
  'media-text': { name: 'Media & text', description: 'A picture beside text' },
  video: { name: 'Video', description: 'An uploaded video' },
  audio: { name: 'Audio', description: 'An uploaded audio clip' },
  embed: { name: 'Embed', description: 'YouTube, Vimeo, X, Instagram, maps…' },
  file: { name: 'File download', description: 'A document to download' },
  toc: { name: 'Table of contents', description: 'Links to the headings' },
  faq: { name: 'FAQ', description: 'Questions and answers' },
  howto: { name: 'How-to', description: 'Numbered steps' },
  timeline: { name: 'Timeline', description: 'Events in order' },
  'pros-cons': { name: 'Pros & cons', description: 'Two lists side by side' },
  stats: { name: 'Stats', description: 'Big numbers with labels' },
  rating: { name: 'Rating', description: 'A score out of five or ten' },
  author: { name: 'Author', description: 'Who wrote it' },
  cta: { name: 'Call to action', description: 'A banner with a button' },
  buttons: { name: 'Buttons', description: 'One to four buttons' },
  related: { name: 'Related articles', description: 'What to read next' },
  newsletter: { name: 'Newsletter', description: 'An email sign-up' },
  accordion: { name: 'Accordion', description: 'Sections that open and close' },
  'accordion-item': { name: 'Accordion item', description: 'One section of an accordion' },
  tabs: { name: 'Tabs', description: 'Content split into tabs' },
  'tab-item': { name: 'Tab', description: 'One tab' },
  disclaimer: { name: 'Disclaimer', description: 'Small print' },
};

const SQ_ELEMENTS: Record<string, ElementText> = {
  section: { name: 'Seksion', description: 'Një brez në gjithë gjerësinë me sfondin e vet' },
  container: { name: 'Kontejner', description: 'Grupon blloqe në një gjerësi të caktuar' },
  columns: { name: 'Kolona', description: 'Dy deri katër kolona krah për krah' },
  column: { name: 'Kolonë', description: 'Një kolonë e bllokut të kolonave' },
  group: { name: 'Grup', description: 'Mban blloqet bashkë, p.sh. për stil' },
  spacer: { name: 'Hapësirë', description: 'Hapësirë vertikale bosh' },
  divider: { name: 'Ndarës', description: 'Një vijë midis pjesëve të artikullit' },
  heading: { name: 'Titull', description: 'Titull seksioni (H2–H4)' },
  paragraph: { name: 'Paragraf', description: 'Tekst' },
  list: { name: 'Listë', description: 'Me pika, me numra ose kontrolli' },
  quote: { name: 'Citim', description: 'Një citim me burimin' },
  'pull-quote': { name: 'Citim i theksuar', description: 'Një rresht nga artikulli, i madh' },
  callout: { name: 'Shënim', description: 'Kuti me këshillë, shënim ose paralajmërim' },
  code: { name: 'Kod', description: 'Kod me ngjyrosje sintakse' },
  table: { name: 'Tabelë', description: 'Rreshta dhe kolona të dhënash' },
  footnote: { name: 'Fusnotë', description: 'Shënim i numëruar në fund' },
  takeaways: { name: 'Pikat kryesore', description: 'Artikulli në pak pika' },
  definitions: { name: 'Përkufizime', description: 'Terma dhe kuptimi i tyre' },
  image: { name: 'Imazh', description: 'Një foto me përshkrim' },
  gallery: { name: 'Galeri', description: 'Disa foto në rrjet ose karusel' },
  'before-after': { name: 'Para / pas', description: 'Dy foto me rrëshqitës' },
  'media-text': { name: 'Media dhe tekst', description: 'Një foto pranë tekstit' },
  video: { name: 'Video', description: 'Një video e ngarkuar' },
  audio: { name: 'Audio', description: 'Një audio e ngarkuar' },
  embed: { name: 'Përfshirje', description: 'YouTube, Vimeo, X, Instagram, harta…' },
  file: { name: 'Skedar', description: 'Një dokument për shkarkim' },
  toc: { name: 'Përmbajtja', description: 'Lidhje te titujt' },
  faq: { name: 'Pyetje të shpeshta', description: 'Pyetje dhe përgjigje' },
  howto: { name: 'Si të', description: 'Hapa të numëruar' },
  timeline: { name: 'Kronologji', description: 'Ngjarje me radhë' },
  'pros-cons': { name: 'Pro dhe kundër', description: 'Dy lista krah për krah' },
  stats: { name: 'Statistika', description: 'Numra të mëdhenj me etiketa' },
  rating: { name: 'Vlerësim', description: 'Pikë nga pesë ose dhjetë' },
  author: { name: 'Autori', description: 'Kush e shkroi' },
  cta: { name: 'Thirrje për veprim', description: 'Banner me buton' },
  buttons: { name: 'Butona', description: 'Një deri katër butona' },
  related: { name: 'Artikuj të ngjashëm', description: 'Çfarë të lexoni më pas' },
  newsletter: { name: 'Buletini', description: 'Regjistrim me email' },
  accordion: { name: 'Fizarmonikë', description: 'Seksione që hapen e mbyllen' },
  'accordion-item': { name: 'Element fizarmonike', description: 'Një seksion' },
  tabs: { name: 'Skeda', description: 'Përmbajtje e ndarë në skeda' },
  'tab-item': { name: 'Skedë', description: 'Një skedë' },
  disclaimer: { name: 'Mohim përgjegjësie', description: 'Shkrim i vogël' },
};

const DE_ELEMENTS: Record<string, ElementText> = {
  section: { name: 'Abschnitt', description: 'Ein breites Band mit eigenem Hintergrund' },
  container: { name: 'Container', description: 'Gruppiert Blöcke in fester Breite' },
  columns: { name: 'Spalten', description: 'Zwei bis vier Spalten nebeneinander' },
  column: { name: 'Spalte', description: 'Eine Spalte eines Spaltenblocks' },
  group: { name: 'Gruppe', description: 'Hält Blöcke zusammen, z. B. zum Gestalten' },
  spacer: { name: 'Abstand', description: 'Leerer vertikaler Raum' },
  divider: { name: 'Trennlinie', description: 'Eine Linie zwischen Teilen' },
  heading: { name: 'Überschrift', description: 'Ein Abschnittstitel (H2–H4)' },
  paragraph: { name: 'Absatz', description: 'Fließtext' },
  list: { name: 'Liste', description: 'Aufzählung, nummeriert oder Checkliste' },
  quote: { name: 'Zitat', description: 'Ein Zitat mit Quelle' },
  'pull-quote': { name: 'Hervorgehobenes Zitat', description: 'Ein Satz aus dem Artikel, groß' },
  callout: { name: 'Hinweis', description: 'Tipp-, Hinweis- oder Warnbox' },
  code: { name: 'Code', description: 'Code mit Syntaxhervorhebung' },
  table: { name: 'Tabelle', description: 'Zeilen und Spalten' },
  footnote: { name: 'Fußnote', description: 'Eine nummerierte Anmerkung' },
  takeaways: { name: 'Das Wichtigste', description: 'Der Artikel in wenigen Punkten' },
  definitions: { name: 'Definitionen', description: 'Begriffe und ihre Bedeutung' },
  image: { name: 'Bild', description: 'Ein Bild mit Bildunterschrift' },
  gallery: { name: 'Galerie', description: 'Mehrere Bilder als Raster oder Karussell' },
  'before-after': { name: 'Vorher / nachher', description: 'Zwei Bilder mit Schieberegler' },
  'media-text': { name: 'Medien & Text', description: 'Ein Bild neben Text' },
  video: { name: 'Video', description: 'Ein hochgeladenes Video' },
  audio: { name: 'Audio', description: 'Eine hochgeladene Audiodatei' },
  embed: { name: 'Einbettung', description: 'YouTube, Vimeo, X, Instagram, Karten…' },
  file: { name: 'Datei', description: 'Ein Dokument zum Herunterladen' },
  toc: { name: 'Inhaltsverzeichnis', description: 'Links zu den Überschriften' },
  faq: { name: 'FAQ', description: 'Fragen und Antworten' },
  howto: { name: 'Anleitung', description: 'Nummerierte Schritte' },
  timeline: { name: 'Zeitleiste', description: 'Ereignisse der Reihe nach' },
  'pros-cons': { name: 'Vor- & Nachteile', description: 'Zwei Listen nebeneinander' },
  stats: { name: 'Kennzahlen', description: 'Große Zahlen mit Beschriftung' },
  rating: { name: 'Bewertung', description: 'Punkte von fünf oder zehn' },
  author: { name: 'Autor', description: 'Wer es geschrieben hat' },
  cta: { name: 'Handlungsaufruf', description: 'Ein Banner mit Button' },
  buttons: { name: 'Buttons', description: 'Ein bis vier Buttons' },
  related: { name: 'Ähnliche Artikel', description: 'Was man als Nächstes liest' },
  newsletter: { name: 'Newsletter', description: 'Eine E-Mail-Anmeldung' },
  accordion: { name: 'Akkordeon', description: 'Aufklappbare Abschnitte' },
  'accordion-item': { name: 'Akkordeon-Eintrag', description: 'Ein Abschnitt' },
  tabs: { name: 'Tabs', description: 'Inhalt in Reitern' },
  'tab-item': { name: 'Tab', description: 'Ein Reiter' },
  disclaimer: { name: 'Haftungsausschluss', description: 'Kleingedrucktes' },
};

const EN: EditorMessages = {
  back: 'Articles',
  untitled: 'Untitled article',
  undo: 'Undo',
  redo: 'Redo',
  nothingToUndo: 'Nothing to undo',
  nothingToRedo: 'Nothing to redo',
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
  zoom: 'Zoom',
  zoomFit: 'Fit',
  preview: 'Preview',
  publish: 'Publish',
  update: 'Update',
  schedule: 'Schedule…',
  saveDraft: 'Save draft',
  unpublish: 'Unpublish',
  duplicateArticle: 'Duplicate article',
  deleteArticle: 'Delete article',
  status_draft: 'Draft',
  status_published: 'Published',
  status_archived: 'Archived',
  status_scheduled: 'Scheduled',
  saveIdle: 'All changes saved',
  saveDirty: 'Unsaved changes',
  saveSaving: 'Saving…',
  saveSaved: 'Saved',
  saveError: 'Not saved — retrying',
  saveConflict: 'Conflict',
  savedAgo: (when) => `Saved · ${when}`,
  justNow: 'just now',
  minutesAgo: (m) => `${String(m)} min ago`,
  hoursAgo: (h) => `${String(h)} h ago`,
  add: 'Add',
  layers: 'Layers',
  templates: 'Templates',
  settings: 'Settings',
  searchElements: 'Search blocks…',
  noElementsFound: 'No block matches that.',
  recentlyUsed: 'Recently used',
  categories: {
    layout: 'Layout',
    text: 'Text',
    media: 'Media',
    article: 'Article',
    engagement: 'Engagement',
    plugin: 'Plugins',
  },
  content: 'Content',
  style: 'Style',
  advanced: 'Advanced',
  document: 'Document',
  general: 'General',
  seo: 'SEO',
  publishing: 'Publishing',
  nothingSelected: 'Select a block to edit it.',
  multipleSelected: (n) => `${String(n)} blocks selected`,
  moveUp: 'Move up',
  moveDown: 'Move down',
  duplicate: 'Duplicate',
  delete: 'Delete',
  selectParent: 'Select parent',
  insertHere: 'Insert a block here',
  insertAfter: 'Insert after',
  turnInto: 'Turn into',
  hide: 'Hide',
  show: 'Show',
  lock: 'Lock',
  unlock: 'Unlock',
  rename: 'Rename',
  anchor: 'Anchor',
  anchorHint: 'Lets a link jump here: /blog/slug#anchor. Letters, digits and dashes.',
  elementName: 'Name in layers',
  hidden: 'Hidden',
  hiddenHint: 'Kept in the article but not shown to readers.',
  locked: 'Locked',
  lockedHint: 'Cannot be moved, edited or deleted until unlocked.',
  breakpoint: 'Screen',
  inherited: 'Inherited',
  reset: 'Reset',
  spacing: 'Spacing',
  layout: 'Layout',
  appearance: 'Appearance',
  typography: 'Typography',
  visibility: 'Visibility',
  hideAt: 'Hide on this screen size',
  styleKeys: {
    marginTop: 'Space above',
    marginBottom: 'Space below',
    paddingX: 'Inner space (sides)',
    paddingY: 'Inner space (top/bottom)',
    width: 'Width',
    align: 'Position',
    textAlign: 'Text alignment',
    textColor: 'Text colour',
    fontSize: 'Text size',
    background: 'Background',
    borderWidth: 'Border',
    borderColor: 'Border colour',
    radius: 'Corners',
    shadow: 'Shadow',
  },
  addItem: 'Add',
  removeItem: 'Remove',
  clear: 'Clear',
  none: 'None',
  upload: 'Upload',
  replace: 'Replace',
  uploading: 'Uploading…',
  uploadFailed: 'The upload failed.',
  chooseImage: 'Choose an image',
  emptyTitle: 'An empty page',
  emptyBody: 'Start writing, or add a block from the left.',
  startWriting: 'Start writing',
  words: (n) => `${String(n)} words`,
  readingTime: (m) => `${String(m)} min read`,
  issues: (n) => `${String(n)} ${n === 1 ? 'issue' : 'issues'}`,
  noIssues: 'No issues',
  jumpTo: 'Show',
  publishBlocked: 'Fix these before publishing:',
  shortcuts: 'Keyboard shortcuts',
  shortcutList: [
    ['Ctrl Z', 'Undo'],
    ['Ctrl Shift Z', 'Redo'],
    ['Ctrl S', 'Save'],
    ['Ctrl Enter', 'Publish / update'],
    ['Ctrl D', 'Duplicate block'],
    ['Delete', 'Delete block'],
    ['Alt ↑ / ↓', 'Move block'],
    ['Esc', 'Select parent / clear'],
    ['Ctrl 1 / 2 / 3', 'Desktop / tablet / mobile'],
    ['[ / ]', 'Toggle left / right panel'],
    ['?', 'This list'],
  ],
  title: 'Title',
  slug: 'Address',
  slugFrozen: 'Fixed once the article exists, so shared links keep working.',
  excerpt: 'Excerpt',
  category: 'Category',
  cover: 'Cover image',
  coverAlt: 'Cover description',
  seoTitle: 'Search title',
  seoDescription: 'Search description',
  canonical: 'Canonical URL',
  noindex: 'Hide from search engines',
  noindexHint: 'Adds noindex — the page stays reachable by its link.',
  focusKeyword: 'Focus keyword',
  featured: 'Featured',
  featuredHint: 'Shown first on the blog.',
  readingMinutes: 'Reading time (minutes)',
  readingMinutesHint: 'Leave empty to work it out from the text.',
  publishAt: 'Publish at',
  scheduleHint: 'The article goes live on its own at this time.',
  cancel: 'Cancel',
  confirm: 'Confirm',
  leaveTitle: 'Leave without saving?',
  leaveBody: 'Your latest changes have not been saved yet.',
  leave: 'Leave',
  stay: 'Stay',
  conflictTitle: 'Someone else saved this article',
  conflictBody: 'Your changes and theirs cannot both be kept. Which version do you want?',
  keepMine: 'Keep mine',
  loadTheirs: 'Load theirs',
  restoreTitle: 'Restore unsaved changes?',
  restoreBody: 'This browser kept changes that never reached the server.',
  restore: 'Restore',
  discard: 'Discard',
  revisions: 'History',
  noRevisions: 'No saved versions yet.',
  revisionKinds: { autosave: 'Autosave', manual: 'Saved', publish: 'Published' },
  restoreRevision: 'Restore this version',
  saveVersion: 'Save as version',
  savedSections: 'Saved sections',
  sectionName: 'Name the selected blocks…',
  saveSection: 'Save selection as a section',
  noSections: 'Select blocks and name them to reuse them in any article.',
  dragToMove: 'Drag to move',
  moreOptions: 'More options',
  close: 'Close',
  versionLabel: 'Version name',
  saved: 'Saved.',
  published: 'Published.',
  scheduled: 'Scheduled.',
  unpublished: 'Moved back to draft.',
  deleteTitle: 'Delete this article?',
  deleteBody: 'It disappears from the list and from the site.',
  cannotPlace: 'That block cannot go there.',
  elements: EN_ELEMENTS,
  issueText: {
    'image.altMissing': 'Image without a description',
    'heading.skippedLevel': 'A heading skips a level',
    'heading.empty': 'Empty heading',
    'paragraph.empty': 'Empty paragraph',
    'paragraph.long': 'Very long paragraph',
    'url.unsafe': 'Unsafe link',
    'link.textMissing': 'A link without text',
    'media.external': 'Picture not uploaded yet',
    'anchor.duplicate': 'Two blocks share an anchor',
    'anchor.invalid': 'Invalid anchor',
    'embed.notAllowed': 'That embed is not allowed',
    'embed.providerMismatch': 'Embed URL does not match its provider',
    'meta.titleMissing': 'No title',
    'meta.excerptMissing': 'No excerpt',
    'meta.coverMissing': 'No cover image',
    'seo.titleLength': 'Search title length',
    'seo.descriptionLength': 'Search description length',
    'button.labelMissing': 'A button without a label',
    'footnote.missing': 'A footnote reference points nowhere',
    'container.minimum': 'A container has too few blocks',
    'props.invalid': 'A block has invalid settings',
  },
  fieldLabels: {},
};

const SQ: EditorMessages = {
  ...EN,
  back: 'Artikujt',
  untitled: 'Artikull pa titull',
  undo: 'Zhbëj',
  redo: 'Ribëj',
  nothingToUndo: 'Asgjë për të zhbërë',
  nothingToRedo: 'Asgjë për të ribërë',
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Celular',
  zoom: 'Zmadhim',
  zoomFit: 'Përshtat',
  preview: 'Parashiko',
  publish: 'Publiko',
  update: 'Përditëso',
  schedule: 'Planifiko…',
  saveDraft: 'Ruaj draftin',
  unpublish: 'Hiq nga publikimi',
  duplicateArticle: 'Dyfisho artikullin',
  deleteArticle: 'Fshi artikullin',
  status_draft: 'Draft',
  status_published: 'Publikuar',
  status_archived: 'Arkivuar',
  status_scheduled: 'Planifikuar',
  saveIdle: 'Të gjitha ndryshimet u ruajtën',
  saveDirty: 'Ndryshime të paruajtura',
  saveSaving: 'Po ruhet…',
  saveSaved: 'U ruajt',
  saveError: 'Nuk u ruajt — po riprovohet',
  saveConflict: 'Konflikt',
  savedAgo: (when) => `U ruajt · ${when}`,
  justNow: 'tani',
  minutesAgo: (m) => `${String(m)} min më parë`,
  hoursAgo: (h) => `${String(h)} orë më parë`,
  add: 'Shto',
  layers: 'Shtresat',
  templates: 'Shabllone',
  settings: 'Cilësimet',
  searchElements: 'Kërko blloqe…',
  noElementsFound: 'Asnjë bllok nuk përputhet.',
  recentlyUsed: 'Përdorur së fundi',
  categories: {
    layout: 'Faqosja',
    text: 'Tekst',
    media: 'Media',
    article: 'Artikull',
    engagement: 'Angazhim',
    plugin: 'Shtesa',
  },
  content: 'Përmbajtja',
  style: 'Stili',
  advanced: 'Të avancuara',
  document: 'Dokumenti',
  general: 'Të përgjithshme',
  seo: 'SEO',
  publishing: 'Publikimi',
  nothingSelected: 'Zgjidhni një bllok për ta ndryshuar.',
  multipleSelected: (n) => `${String(n)} blloqe të zgjedhura`,
  moveUp: 'Lëviz lart',
  moveDown: 'Lëviz poshtë',
  duplicate: 'Dyfisho',
  delete: 'Fshi',
  selectParent: 'Zgjidh prindin',
  insertHere: 'Shto një bllok këtu',
  insertAfter: 'Shto pas',
  turnInto: 'Ktheje në',
  hide: 'Fshih',
  show: 'Shfaq',
  lock: 'Kyç',
  unlock: 'Zhbllok',
  rename: 'Riemërto',
  anchor: 'Ankorë',
  anchorHint: 'Lejon një lidhje të kërcejë këtu: /blog/slug#ankore.',
  elementName: 'Emri në shtresa',
  hidden: 'I fshehur',
  hiddenHint: 'Mbetet në artikull, por nuk u shfaqet lexuesve.',
  locked: 'I kyçur',
  lockedHint: 'Nuk mund të lëvizet, ndryshohet ose fshihet derisa të zhbllokohet.',
  breakpoint: 'Ekrani',
  inherited: 'E trashëguar',
  reset: 'Rivendos',
  spacing: 'Hapësira',
  layout: 'Faqosja',
  appearance: 'Pamja',
  typography: 'Tipografia',
  visibility: 'Dukshmëria',
  hideAt: 'Fshih në këtë madhësi ekrani',
  styleKeys: {
    marginTop: 'Hapësirë sipër',
    marginBottom: 'Hapësirë poshtë',
    paddingX: 'Hapësirë e brendshme (anash)',
    paddingY: 'Hapësirë e brendshme (lart/poshtë)',
    width: 'Gjerësia',
    align: 'Pozicioni',
    textAlign: 'Drejtimi i tekstit',
    textColor: 'Ngjyra e tekstit',
    fontSize: 'Madhësia e tekstit',
    background: 'Sfondi',
    borderWidth: 'Kufiri',
    borderColor: 'Ngjyra e kufirit',
    radius: 'Qoshet',
    shadow: 'Hija',
  },
  addItem: 'Shto',
  removeItem: 'Hiq',
  clear: 'Pastro',
  none: 'Asnjë',
  upload: 'Ngarko',
  replace: 'Zëvendëso',
  uploading: 'Po ngarkohet…',
  uploadFailed: 'Ngarkimi dështoi.',
  chooseImage: 'Zgjidhni një imazh',
  emptyTitle: 'Një faqe bosh',
  emptyBody: 'Filloni të shkruani, ose shtoni një bllok nga e majta.',
  startWriting: 'Fillo të shkruash',
  words: (n) => `${String(n)} fjalë`,
  readingTime: (m) => `${String(m)} min lexim`,
  issues: (n) => `${String(n)} ${n === 1 ? 'problem' : 'probleme'}`,
  noIssues: 'Asnjë problem',
  jumpTo: 'Shfaq',
  publishBlocked: 'Rregulloni këto para publikimit:',
  shortcuts: 'Shkurtoret e tastierës',
  shortcutList: [
    ['Ctrl Z', 'Zhbëj'],
    ['Ctrl Shift Z', 'Ribëj'],
    ['Ctrl S', 'Ruaj'],
    ['Ctrl Enter', 'Publiko / përditëso'],
    ['Ctrl D', 'Dyfisho bllokun'],
    ['Delete', 'Fshi bllokun'],
    ['Alt ↑ / ↓', 'Lëviz bllokun'],
    ['Esc', 'Zgjidh prindin / pastro'],
    ['Ctrl 1 / 2 / 3', 'Desktop / tablet / celular'],
    ['[ / ]', 'Paneli majtas / djathtas'],
    ['?', 'Kjo listë'],
  ],
  title: 'Titulli',
  slug: 'Adresa',
  slugFrozen: 'Fiksohet pasi artikulli ekziston, që lidhjet e ndara të funksionojnë.',
  excerpt: 'Përmbledhja',
  category: 'Kategoria',
  cover: 'Imazhi kryesor',
  coverAlt: 'Përshkrimi i imazhit',
  seoTitle: 'Titulli për kërkim',
  seoDescription: 'Përshkrimi për kërkim',
  canonical: 'URL kanonike',
  noindex: 'Fshihe nga motorët e kërkimit',
  noindexHint: 'Shton noindex — faqja mbetet e arritshme me lidhjen e saj.',
  focusKeyword: 'Fjala kyçe',
  featured: 'I veçuar',
  featuredHint: 'Shfaqet i pari në blog.',
  readingMinutes: 'Koha e leximit (minuta)',
  readingMinutesHint: 'Lëreni bosh që të llogaritet nga teksti.',
  publishAt: 'Publiko më',
  scheduleHint: 'Artikulli publikohet vetë në këtë kohë.',
  cancel: 'Anulo',
  confirm: 'Konfirmo',
  leaveTitle: 'Të largoheni pa ruajtur?',
  leaveBody: 'Ndryshimet e fundit nuk janë ruajtur ende.',
  leave: 'Largohu',
  stay: 'Qëndro',
  conflictTitle: 'Dikush tjetër e ruajti këtë artikull',
  conflictBody: 'Nuk mund të mbahen të dy versionet. Cilin doni?',
  keepMine: 'Mbaj timin',
  loadTheirs: 'Ngarko të tyrin',
  restoreTitle: 'Të rikthehen ndryshimet e paruajtura?',
  restoreBody: 'Ky shfletues mbajti ndryshime që nuk arritën në server.',
  restore: 'Rikthe',
  discard: 'Hidh',
  revisions: 'Historiku',
  noRevisions: 'Asnjë version i ruajtur ende.',
  revisionKinds: { autosave: 'Ruajtje automatike', manual: 'Ruajtur', publish: 'Publikuar' },
  restoreRevision: 'Rikthe këtë version',
  saveVersion: 'Ruaj si version',
  savedSections: 'Seksione të ruajtura',
  sectionName: 'Emërtoni blloqet e zgjedhura…',
  saveSection: 'Ruaj zgjedhjen si seksion',
  noSections: "Zgjidhni blloqe dhe emërtojini për t'i ripërdorur në çdo artikull.",
  dragToMove: 'Tërhiqeni për ta lëvizur',
  moreOptions: 'Më shumë opsione',
  close: 'Mbyll',
  versionLabel: 'Emri i versionit',
  saved: 'U ruajt.',
  published: 'U publikua.',
  scheduled: 'U planifikua.',
  unpublished: 'U kthye në draft.',
  deleteTitle: 'Ta fshini këtë artikull?',
  deleteBody: 'Zhduket nga lista dhe nga faqja.',
  cannotPlace: 'Ky bllok nuk mund të vendoset aty.',
  elements: SQ_ELEMENTS,
  issueText: {
    ...EN.issueText,
    'image.altMissing': 'Imazh pa përshkrim',
    'heading.skippedLevel': 'Një titull kapërcen një nivel',
    'heading.empty': 'Titull bosh',
    'paragraph.empty': 'Paragraf bosh',
    'paragraph.long': 'Paragraf shumë i gjatë',
    'url.unsafe': 'Lidhje e pasigurt',
    'media.external': 'Imazh ende i pangarkuar',
    'anchor.duplicate': 'Dy blloqe kanë të njëjtën ankorë',
    'meta.titleMissing': 'Pa titull',
    'meta.excerptMissing': 'Pa përmbledhje',
    'meta.coverMissing': 'Pa imazh kryesor',
    'button.labelMissing': 'Buton pa etiketë',
  },
};

const DE: EditorMessages = {
  ...EN,
  back: 'Artikel',
  untitled: 'Unbenannter Artikel',
  undo: 'Rückgängig',
  redo: 'Wiederholen',
  nothingToUndo: 'Nichts rückgängig zu machen',
  nothingToRedo: 'Nichts zu wiederholen',
  mobile: 'Handy',
  zoomFit: 'Einpassen',
  preview: 'Vorschau',
  publish: 'Veröffentlichen',
  update: 'Aktualisieren',
  schedule: 'Planen…',
  saveDraft: 'Entwurf speichern',
  unpublish: 'Zurückziehen',
  duplicateArticle: 'Artikel duplizieren',
  deleteArticle: 'Artikel löschen',
  status_draft: 'Entwurf',
  status_published: 'Veröffentlicht',
  status_archived: 'Archiviert',
  status_scheduled: 'Geplant',
  saveIdle: 'Alles gespeichert',
  saveDirty: 'Ungespeicherte Änderungen',
  saveSaving: 'Speichern…',
  saveSaved: 'Gespeichert',
  saveError: 'Nicht gespeichert — neuer Versuch',
  saveConflict: 'Konflikt',
  savedAgo: (when) => `Gespeichert · ${when}`,
  justNow: 'gerade eben',
  minutesAgo: (m) => `vor ${String(m)} Min.`,
  hoursAgo: (h) => `vor ${String(h)} Std.`,
  add: 'Hinzufügen',
  layers: 'Ebenen',
  templates: 'Vorlagen',
  settings: 'Einstellungen',
  searchElements: 'Blöcke suchen…',
  noElementsFound: 'Kein Block passt.',
  recentlyUsed: 'Zuletzt verwendet',
  categories: {
    layout: 'Layout',
    text: 'Text',
    media: 'Medien',
    article: 'Artikel',
    engagement: 'Interaktion',
    plugin: 'Erweiterungen',
  },
  content: 'Inhalt',
  style: 'Stil',
  advanced: 'Erweitert',
  document: 'Dokument',
  general: 'Allgemein',
  publishing: 'Veröffentlichung',
  nothingSelected: 'Einen Block auswählen, um ihn zu bearbeiten.',
  multipleSelected: (n) => `${String(n)} Blöcke ausgewählt`,
  moveUp: 'Nach oben',
  moveDown: 'Nach unten',
  duplicate: 'Duplizieren',
  delete: 'Löschen',
  selectParent: 'Übergeordnetes auswählen',
  insertHere: 'Hier einen Block einfügen',
  insertAfter: 'Danach einfügen',
  turnInto: 'Umwandeln in',
  hide: 'Ausblenden',
  show: 'Einblenden',
  lock: 'Sperren',
  unlock: 'Entsperren',
  rename: 'Umbenennen',
  anchor: 'Anker',
  elementName: 'Name in Ebenen',
  hidden: 'Ausgeblendet',
  locked: 'Gesperrt',
  breakpoint: 'Bildschirm',
  inherited: 'Geerbt',
  reset: 'Zurücksetzen',
  spacing: 'Abstände',
  appearance: 'Aussehen',
  typography: 'Typografie',
  visibility: 'Sichtbarkeit',
  addItem: 'Hinzufügen',
  removeItem: 'Entfernen',
  clear: 'Leeren',
  none: 'Keine',
  upload: 'Hochladen',
  replace: 'Ersetzen',
  uploading: 'Wird hochgeladen…',
  uploadFailed: 'Hochladen fehlgeschlagen.',
  chooseImage: 'Bild auswählen',
  emptyTitle: 'Eine leere Seite',
  emptyBody: 'Einfach losschreiben oder links einen Block hinzufügen.',
  startWriting: 'Losschreiben',
  words: (n) => `${String(n)} Wörter`,
  readingTime: (m) => `${String(m)} Min. Lesezeit`,
  issues: (n) => `${String(n)} ${n === 1 ? 'Problem' : 'Probleme'}`,
  noIssues: 'Keine Probleme',
  jumpTo: 'Zeigen',
  publishBlocked: 'Vor dem Veröffentlichen beheben:',
  shortcuts: 'Tastenkürzel',
  title: 'Titel',
  slug: 'Adresse',
  excerpt: 'Kurzfassung',
  category: 'Kategorie',
  cover: 'Titelbild',
  coverAlt: 'Bildbeschreibung',
  featured: 'Hervorgehoben',
  readingMinutes: 'Lesezeit (Minuten)',
  publishAt: 'Veröffentlichen am',
  cancel: 'Abbrechen',
  confirm: 'Bestätigen',
  leaveTitle: 'Ohne Speichern verlassen?',
  leave: 'Verlassen',
  stay: 'Bleiben',
  keepMine: 'Meine behalten',
  loadTheirs: 'Ihre laden',
  restore: 'Wiederherstellen',
  discard: 'Verwerfen',
  revisions: 'Verlauf',
  saved: 'Gespeichert.',
  published: 'Veröffentlicht.',
  scheduled: 'Geplant.',
  deleteTitle: 'Diesen Artikel löschen?',
  moreOptions: 'Weitere Optionen',
  close: 'Schließen',
  elements: DE_ELEMENTS,
};

const CATALOGUE: Record<string, EditorMessages> = { en: EN, sq: SQ, de: DE };

export function editorMessages(
  locale: string,
  overrides?: Partial<EditorMessages>,
): EditorMessages {
  return { ...(CATALOGUE[locale] ?? EN), ...overrides };
}

/** A prop name as a label, when no translation names it: `dropCap` → "Drop cap". */
export function humanize(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
