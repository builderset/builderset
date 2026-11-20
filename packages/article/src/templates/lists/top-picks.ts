import { heading, image, lead, paragraph, rating, related } from '../blocks';
import { defineTemplate } from '../categories';

export default defineTemplate({
  id: 'top-picks',
  category: 'lists',
  name: { en: 'Top picks', sq: 'Zgjedhjet më të mira', de: 'Die besten Tipps' },
  description: {
    en: 'A ranked shortlist: each pick with a photo, why, and a score',
    sq: 'Një listë e renditur: secila me foto, arsye dhe vlerësim',
    de: 'Eine Rangliste: jeder Tipp mit Bild, Begründung und Wertung',
  },
  blocks: [
    lead('What you picked from, and how you chose.'),
    heading('1. The best overall'),
    image('The winner.'),
    paragraph('Why it came first, and who it suits.'),
    rating('The best overall', 5, 'One sentence on why it wins.'),
    heading('2. The best value'),
    paragraph('What you get for less, and what you give up.'),
    rating('The best value', 4, 'One sentence on why it is worth it.'),
    related(),
  ],
});
