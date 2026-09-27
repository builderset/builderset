import type { EditorMessages, ElementText } from '@motors/builder-react';

/**
 * The email editor's words: its blocks and categories, and the article
 * editor's words that mean something else for an email ("Publish" is
 * "Activate" — an email is not published, it becomes the one that is sent).
 */

type EmailWords = Partial<EditorMessages> & {
  elements: Record<string, ElementText>;
  email: EmailSettingsWords;
};

export interface EmailSettingsWords {
  settings: string;
  general: string;
  style: string;
  darkMode: string;
  tracking: string;
  name: string;
  subject: string;
  subjectHint: string;
  preheader: string;
  preheaderHint: string;
  inboxPreview: string;
  width: string;
  backdrop: string;
  background: string;
  font: string;
  fontSize: string;
  lineHeight: string;
  textColor: string;
  headingColor: string;
  linkColor: string;
  darkModeMode: string;
  darkAuto: string;
  darkCustom: string;
  darkHint: string;
  utmEnabled: string;
  utmHint: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  insertVariable: string;
  modules: string;
  noModules: string;
  moduleName: string;
  saveModule: string;
  columns: (count: number) => string;
  type: string;
  variables: string;
}

const EN_ELEMENTS: Record<string, ElementText> = {
  section: { name: 'Section', description: 'A band across the email' },
  row: { name: 'Row', description: 'One to four columns' },
  column: { name: 'Column', description: 'A column of a row' },
  heading: { name: 'Heading', description: 'A title' },
  text: { name: 'Text', description: 'A paragraph, with variables' },
  list: { name: 'List', description: 'Bullets, numbers or checks' },
  button: { name: 'Button', description: 'A link that looks like a button' },
  image: { name: 'Image', description: 'A picture, with a link' },
  divider: { name: 'Divider', description: 'A line' },
  spacer: { name: 'Spacer', description: 'Empty space' },
  quote: { name: 'Quote', description: 'A testimonial or citation' },
  video: { name: 'Video', description: 'A thumbnail linking to a video' },
  logo: { name: 'Logo', description: 'The brand logo' },
  social: { name: 'Social', description: 'Links to social profiles' },
  menu: { name: 'Menu', description: 'A row of links' },
  product: { name: 'Product card', description: 'Image, title, price, button' },
  coupon: { name: 'Coupon', description: 'A discount code' },
  'key-value': { name: 'Details', description: 'Label and value rows' },
  'line-items': { name: 'Line items', description: 'A table of items, repeated' },
  survey: { name: 'Survey', description: 'A 0–10 or 1–5 score' },
  footer: { name: 'Footer', description: 'Address and unsubscribe' },
  conditional: { name: 'Conditional', description: 'Shown only when…' },
  repeat: { name: 'Repeat', description: 'Once per item of a list' },
};

const SQ_ELEMENTS: Record<string, ElementText> = {
  section: { name: 'Seksion', description: 'Një brez në email' },
  row: { name: 'Rresht', description: 'Një deri katër kolona' },
  column: { name: 'Kolonë', description: 'Një kolonë e rreshtit' },
  heading: { name: 'Titull', description: 'Një titull' },
  text: { name: 'Tekst', description: 'Një paragraf, me variabla' },
  list: { name: 'Listë', description: 'Me pika, numra ose shenja' },
  button: { name: 'Buton', description: 'Një lidhje në formë butoni' },
  image: { name: 'Imazh', description: 'Një foto, me lidhje' },
  divider: { name: 'Ndarës', description: 'Një vijë' },
  spacer: { name: 'Hapësirë', description: 'Hapësirë bosh' },
  quote: { name: 'Citim', description: 'Dëshmi ose citim' },
  video: { name: 'Video', description: 'Një foto që hap videon' },
  logo: { name: 'Logo', description: 'Logoja e markës' },
  social: { name: 'Rrjete sociale', description: 'Lidhje te profilet' },
  menu: { name: 'Menu', description: 'Një rresht lidhjesh' },
  product: { name: 'Kartë produkti', description: 'Foto, titull, çmim, buton' },
  coupon: { name: 'Kupon', description: 'Një kod zbritjeje' },
  'key-value': { name: 'Detaje', description: 'Rreshta etiketë e vlerë' },
  'line-items': { name: 'Artikujt', description: 'Tabelë artikujsh, e përsëritur' },
  survey: { name: 'Anketë', description: 'Vlerësim 0–10 ose 1–5' },
  footer: { name: 'Fundi', description: 'Adresa dhe çregjistrimi' },
  conditional: { name: 'Me kusht', description: 'Shfaqet vetëm kur…' },
  repeat: { name: 'Përsërit', description: 'Një herë për çdo element' },
};

const DE_ELEMENTS: Record<string, ElementText> = {
  section: { name: 'Abschnitt', description: 'Ein Band über die E-Mail' },
  row: { name: 'Zeile', description: 'Eine bis vier Spalten' },
  column: { name: 'Spalte', description: 'Eine Spalte einer Zeile' },
  heading: { name: 'Überschrift', description: 'Ein Titel' },
  text: { name: 'Text', description: 'Ein Absatz, mit Variablen' },
  list: { name: 'Liste', description: 'Punkte, Zahlen oder Häkchen' },
  button: { name: 'Button', description: 'Ein Link als Button' },
  image: { name: 'Bild', description: 'Ein Bild mit Link' },
  divider: { name: 'Trennlinie', description: 'Eine Linie' },
  spacer: { name: 'Abstand', description: 'Leerer Raum' },
  quote: { name: 'Zitat', description: 'Stimme oder Zitat' },
  video: { name: 'Video', description: 'Vorschaubild mit Link zum Video' },
  logo: { name: 'Logo', description: 'Das Markenlogo' },
  social: { name: 'Social Media', description: 'Links zu Profilen' },
  menu: { name: 'Menü', description: 'Eine Reihe von Links' },
  product: { name: 'Produktkarte', description: 'Bild, Titel, Preis, Button' },
  coupon: { name: 'Gutschein', description: 'Ein Rabattcode' },
  'key-value': { name: 'Details', description: 'Zeilen mit Bezeichnung und Wert' },
  'line-items': { name: 'Positionen', description: 'Tabelle, wiederholt je Position' },
  survey: { name: 'Umfrage', description: 'Bewertung 0–10 oder 1–5' },
  footer: { name: 'Fußzeile', description: 'Adresse und Abmeldung' },
  conditional: { name: 'Bedingt', description: 'Nur anzeigen, wenn…' },
  repeat: { name: 'Wiederholen', description: 'Einmal je Listenelement' },
};

const EN: EmailWords = {
  elements: EN_ELEMENTS,
  categories: {
    structure: 'Structure',
    content: 'Content',
    media: 'Media',
    brand: 'Brand',
    commerce: 'Commerce',
    data: 'Data',
    compliance: 'Compliance',
    logic: 'Logic',
  },
  back: 'Email templates',
  untitled: 'Untitled email',
  publish: 'Activate',
  update: 'Update active',
  unpublish: 'Deactivate',
  saveDraft: 'Save',
  status_published: 'Active',
  status_draft: 'Draft',
  published: 'Activated — this design is now sent.',
  unpublished: 'No longer sent.',
  publishBlocked: 'Fix these before activating:',
  emptyTitle: 'An empty email',
  emptyBody: 'Add a structure or a block from the left, or start writing.',
  templates: 'Modules',
  deleteArticle: 'Delete design',
  duplicateArticle: 'Duplicate design',
  deleteTitle: 'Delete this design?',
  deleteBody: 'It is removed from the email templates.',
  issueText: {
    'meta.subjectMissing': 'No subject line',
    'meta.preheaderMissing': 'No preheader',
    'variable.unknown': 'A variable this email does not have',
    'variable.mustUse': 'A required variable is not used',
    'compliance.unsubscribeMissing': 'No unsubscribe link (marketing email)',
    'row.columnsMismatch': 'A row has the wrong number of columns',
    'button.labelMissing': 'A button without a label',
    'button.linkMissing': 'A button without a link',
    'image.altMissing': 'Image without a description',
    'media.missing': 'An image not chosen yet',
    'url.unsafe': 'Unsafe link',
    'text.empty': 'Empty text',
    'props.invalid': 'A block has invalid settings',
    'placement.notAllowed': 'A block is in the wrong place',
    'conditional.empty': 'A conditional block has no condition',
  },
  email: {
    settings: 'Email settings',
    general: 'General',
    style: 'Style',
    darkMode: 'Dark mode',
    tracking: 'Tracking',
    name: 'Design name',
    subject: 'Subject',
    subjectHint: 'Variables are filled in when it is sent.',
    preheader: 'Preheader',
    preheaderHint: 'The grey line after the subject in the inbox.',
    inboxPreview: 'In the inbox',
    width: 'Content width',
    backdrop: 'Page background',
    background: 'Content background',
    font: 'Font',
    fontSize: 'Text size',
    lineHeight: 'Line height',
    textColor: 'Text colour',
    headingColor: 'Heading colour',
    linkColor: 'Link colour',
    darkModeMode: 'In dark mode',
    darkAuto: 'Let the mail app decide',
    darkCustom: 'Use my colours',
    darkHint: 'Apple Mail, Outlook.com and the Gmail app honour custom dark colours.',
    utmEnabled: 'Add UTM parameters to links',
    utmHint: 'Lets analytics tell which email a visit came from.',
    utmSource: 'Source',
    utmMedium: 'Medium',
    utmCampaign: 'Campaign',
    insertVariable: 'Insert a variable',
    modules: 'Saved modules',
    noModules: 'Select a section and save it to reuse it in any email.',
    moduleName: 'Name the selected section…',
    saveModule: 'Save as module',
    columns: (count) => (count === 1 ? '1 column' : `${String(count)} columns`),
    type: 'Email type',
    variables: 'Variables',
  },
};

const SQ: EmailWords = {
  ...EN,
  elements: SQ_ELEMENTS,
  categories: {
    structure: 'Struktura',
    content: 'Përmbajtja',
    media: 'Media',
    brand: 'Marka',
    commerce: 'Tregti',
    data: 'Të dhëna',
    compliance: 'Ligjore',
    logic: 'Logjika',
  },
  back: 'Shabllonet e emailit',
  untitled: 'Email pa titull',
  publish: 'Aktivizo',
  update: 'Përditëso aktivin',
  unpublish: 'Çaktivizo',
  saveDraft: 'Ruaj',
  status_published: 'Aktiv',
  status_draft: 'Draft',
  published: 'U aktivizua — tani dërgohet ky dizajn.',
  unpublished: 'Nuk dërgohet më.',
  publishBlocked: 'Rregulloni këto para aktivizimit:',
  emptyTitle: 'Një email bosh',
  emptyBody: 'Shtoni një strukturë ose bllok nga e majta, ose filloni të shkruani.',
  templates: 'Modulet',
  deleteArticle: 'Fshi dizajnin',
  duplicateArticle: 'Dyfisho dizajnin',
  deleteTitle: 'Ta fshini këtë dizajn?',
  deleteBody: 'Hiqet nga shabllonet e emailit.',
  issueText: {
    ...EN.issueText,
    'meta.subjectMissing': 'Pa subjekt',
    'meta.preheaderMissing': 'Pa paratekst',
    'variable.unknown': 'Një variabël që ky email nuk e ka',
    'variable.mustUse': 'Një variabël e detyrueshme nuk përdoret',
    'compliance.unsubscribeMissing': 'Pa lidhje çregjistrimi (email marketingu)',
    'row.columnsMismatch': 'Një rresht ka numër të gabuar kolonash',
    'button.labelMissing': 'Buton pa etiketë',
    'button.linkMissing': 'Buton pa lidhje',
    'image.altMissing': 'Imazh pa përshkrim',
    'media.missing': 'Imazh ende i pazgjedhur',
    'url.unsafe': 'Lidhje e pasigurt',
    'text.empty': 'Tekst bosh',
  },
  email: {
    ...EN.email,
    settings: 'Cilësimet e emailit',
    general: 'Të përgjithshme',
    style: 'Stili',
    darkMode: 'Modaliteti i errët',
    tracking: 'Gjurmimi',
    name: 'Emri i dizajnit',
    subject: 'Subjekti',
    subjectHint: 'Variablat plotësohen kur dërgohet.',
    preheader: 'Parateksti',
    preheaderHint: 'Rreshti gri pas subjektit në kutinë postare.',
    inboxPreview: 'Në kutinë postare',
    width: 'Gjerësia e përmbajtjes',
    backdrop: 'Sfondi i faqes',
    background: 'Sfondi i përmbajtjes',
    font: 'Shkronja',
    fontSize: 'Madhësia e tekstit',
    lineHeight: 'Lartësia e rreshtit',
    textColor: 'Ngjyra e tekstit',
    headingColor: 'Ngjyra e titujve',
    linkColor: 'Ngjyra e lidhjeve',
    darkModeMode: 'Në modalitetin e errët',
    darkAuto: 'Le të vendosë aplikacioni',
    darkCustom: 'Përdor ngjyrat e mia',
    darkHint: 'Apple Mail, Outlook.com dhe Gmail respektojnë ngjyrat e errëta.',
    utmEnabled: 'Shto parametra UTM te lidhjet',
    utmHint: 'Analitika tregon nga cili email erdhi vizita.',
    utmSource: 'Burimi',
    utmMedium: 'Mjeti',
    utmCampaign: 'Fushata',
    insertVariable: 'Fut një variabël',
    modules: 'Modulet e ruajtura',
    noModules: 'Zgjidhni një seksion dhe ruajeni për ta ripërdorur.',
    moduleName: 'Emërtoni seksionin e zgjedhur…',
    saveModule: 'Ruaj si modul',
    columns: (count) => (count === 1 ? '1 kolonë' : `${String(count)} kolona`),
    type: 'Lloji i emailit',
    variables: 'Variablat',
  },
};

const DE: EmailWords = {
  ...EN,
  elements: DE_ELEMENTS,
  categories: {
    structure: 'Struktur',
    content: 'Inhalt',
    media: 'Medien',
    brand: 'Marke',
    commerce: 'Handel',
    data: 'Daten',
    compliance: 'Rechtliches',
    logic: 'Logik',
  },
  back: 'E-Mail-Vorlagen',
  untitled: 'Unbenannte E-Mail',
  publish: 'Aktivieren',
  update: 'Aktive aktualisieren',
  unpublish: 'Deaktivieren',
  saveDraft: 'Speichern',
  status_published: 'Aktiv',
  status_draft: 'Entwurf',
  published: 'Aktiviert — dieses Design wird jetzt versendet.',
  unpublished: 'Wird nicht mehr versendet.',
  publishBlocked: 'Vor dem Aktivieren beheben:',
  emptyTitle: 'Eine leere E-Mail',
  emptyBody: 'Links eine Struktur oder einen Block hinzufügen, oder losschreiben.',
  templates: 'Module',
  email: {
    ...EN.email,
    settings: 'E-Mail-Einstellungen',
    general: 'Allgemein',
    style: 'Stil',
    darkMode: 'Dunkelmodus',
    subject: 'Betreff',
    preheader: 'Vorschautext',
    inboxPreview: 'Im Posteingang',
    width: 'Inhaltsbreite',
    backdrop: 'Seitenhintergrund',
    background: 'Inhaltshintergrund',
    font: 'Schrift',
    fontSize: 'Textgröße',
    lineHeight: 'Zeilenhöhe',
    textColor: 'Textfarbe',
    headingColor: 'Überschriftenfarbe',
    linkColor: 'Linkfarbe',
    insertVariable: 'Variable einfügen',
    modules: 'Gespeicherte Module',
    saveModule: 'Als Modul speichern',
    columns: (count) => (count === 1 ? '1 Spalte' : `${String(count)} Spalten`),
    type: 'E-Mail-Typ',
    variables: 'Variablen',
  },
};

const CATALOGUE: Record<string, EmailWords> = { en: EN, sq: SQ, de: DE };

export function emailWords(locale: string): EmailWords {
  return CATALOGUE[locale] ?? EN;
}

export type { EmailWords };
