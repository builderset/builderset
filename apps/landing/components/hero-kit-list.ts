/** The kits the hero shows, in the switcher's order. Plain data: the server reads it too. */
export const HERO_KITS = [
  {
    id: 'article',
    label: 'Article',
    word: 'articles',
    what: 'The article editor, with a sample that uses every block.',
  },
  {
    id: 'email',
    label: 'Email',
    word: 'emails',
    what: 'The email editor, with a template that uses every block.',
  },
  {
    id: 'form',
    label: 'Form',
    word: 'forms',
    what: 'The form editor, with a job application of several steps.',
  },
  {
    id: 'card',
    label: 'Card',
    word: 'cards',
    what: 'The card editor, with a membership card in millimetres, front and back.',
  },
  {
    id: 'popup',
    label: 'Popup',
    word: 'popups',
    what: 'The popup editor, with a modal on its free canvas.',
  },
] as const;

export type HeroKitId = (typeof HERO_KITS)[number]['id'];
