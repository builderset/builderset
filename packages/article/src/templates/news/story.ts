import { image, lead, paragraph, quote, related } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'news',
  category: 'news',
  name: { en: 'News story', sq: 'Lajm', de: 'Nachricht' },
  description: {
    en: 'What happened first, a photo, a quote, the background',
    sq: 'Çfarë ndodhi së pari, një foto, një citat, sfondi',
    de: 'Was passiert ist zuerst, ein Bild, ein Zitat, der Hintergrund',
  },
  blocks: [
    lead('What happened, who it affects, and when — in the first sentence.'),
    image('What the photo shows, and where it was taken.'),
    paragraph('The most important detail next, then the rest in order of importance.'),
    quote('What someone involved said about it.', 'Name, role'),
    paragraph('The background: what led to this, and what happens next.'),
    related(),
  ],
});
