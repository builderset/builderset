import {
  type BuilderNode,
  type NodeId,
  createFragment,
  type ElementRegistry,
  rt,
  type RichText,
} from '@builderset/engine';
import { createArticleDocument, type ArticleDocument } from './document';

/**
 * A document holding one of every standard element, filled in the way a
 * writer would fill it — for the renderer's tests, the playground screen, and
 * the fixtures the server's contract test reads.
 *
 * Ids are renumbered `n1`, `n2`, … in document order, so the output is stable
 * byte for byte and a committed fixture only changes when an element does.
 */

const para = (text: string): RichText => rt(text);

/**
 * Keys in the server's own format (`folder/yyyy/mm/random.ext`), so the
 * fixtures built from this document pass the API's key check as well as the
 * schema — the server refuses anything else.
 */
const sampleKey = (folder: string, name: string, extension: string) =>
  `${folder}/2026/01/${name.replace(/[^a-z0-9]/g, '').padEnd(16, '0')}.${extension}`;

const SAMPLE_MEDIA = (name: string) => ({
  key: sampleKey('article-image', name, 'jpg'),
  width: 1600,
  height: 900,
  mime: 'image/jpeg',
});

interface Spec {
  type: string;
  props?: Record<string, unknown>;
  children?: Spec[];
}

const SPECS: Spec[] = [
  { type: 'heading', props: { level: 2, text: para('Why buy a used car now') } },
  {
    type: 'paragraph',
    props: {
      dropCap: true,
      text: [
        { text: 'Prices have ' },
        { text: 'settled', marks: [{ type: 'bold' }] },
        { text: ' after two years, and ' },
        { text: 'our guide', marks: [{ type: 'link', href: '/guides/used-cars' }] },
        { text: ' explains what that means.' },
      ],
    },
  },
  { type: 'toc', props: { title: 'In this article', depth: 3 } },
  {
    type: 'list',
    props: {
      style: 'bullet',
      items: [
        { text: para('Lower depreciation') },
        { text: para('Wider choice'), children: [{ text: para('Especially diesels') }] },
      ],
    },
  },
  {
    type: 'quote',
    props: {
      text: para('A good used car is a new car someone else paid for.'),
      cite: 'Service manager',
    },
  },
  { type: 'pull-quote', props: { text: 'Buy the car, not the story.', cite: 'Anonymous' } },
  {
    type: 'callout',
    props: { tone: 'tip', title: 'Before you go', text: para('Bring the service book.') },
  },
  {
    type: 'code',
    props: { code: 'const vin = "WVWZZZ1KZAW000000";', language: 'typescript', filename: 'vin.ts' },
  },
  {
    type: 'table',
    props: {
      rows: [
        [para('Model'), para('Year'), para('Price')],
        [para('Golf'), para('2019'), para('€14 500')],
      ],
      align: ['start', 'center', 'end'],
      caption: 'Average prices',
    },
  },
  { type: 'footnote', props: { text: para('Source: our 2026 valuation data.') } },
  {
    type: 'takeaways',
    props: { title: 'Key points', items: [para('Check the history'), para('Test drive twice')] },
  },
  {
    type: 'definitions',
    props: { items: [{ term: 'VIN', description: para('The vehicle identification number.') }] },
  },
  { type: 'heading', props: { level: 3, text: para('Photos') } },
  {
    type: 'image',
    props: {
      media: SAMPLE_MEDIA('front'),
      alt: 'A grey hatchback from the front',
      caption: para('The test car'),
    },
  },
  {
    type: 'gallery',
    props: {
      images: [
        { media: SAMPLE_MEDIA('side'), alt: 'Side view', caption: '' },
        { media: SAMPLE_MEDIA('rear'), alt: 'Rear view', caption: '' },
      ],
    },
  },
  {
    type: 'before-after',
    props: {
      before: { media: SAMPLE_MEDIA('before'), alt: 'Scratched door', label: 'Before' },
      after: { media: SAMPLE_MEDIA('after'), alt: 'Repaired door', label: 'After' },
    },
  },
  {
    type: 'media-text',
    props: {
      media: SAMPLE_MEDIA('interior'),
      alt: 'Interior',
      title: 'Inside',
      text: para('Clean and quiet.'),
    },
  },
  {
    type: 'video',
    props: {
      media: { key: sampleKey('article-media', 'drive', 'mp4'), mime: 'video/mp4' },
      title: 'Test drive',
    },
  },
  {
    type: 'audio',
    props: {
      media: { key: sampleKey('article-media', 'engine', 'mp3'), mime: 'audio/mpeg' },
      title: 'Engine at idle',
    },
  },
  {
    type: 'embed',
    props: {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      provider: 'youtube',
      title: 'Review',
    },
  },
  {
    type: 'file',
    props: {
      media: {
        key: sampleKey('article-file', 'checklist', 'pdf'),
        mime: 'application/pdf',
        size: 120000,
        name: 'checklist.pdf',
      },
      label: 'Inspection checklist',
    },
  },
  {
    type: 'faq',
    props: {
      title: 'Questions',
      items: [{ question: 'Is a diesel worth it?', answer: para('For long commutes, yes.') }],
    },
  },
  {
    type: 'howto',
    props: {
      title: 'Inspect a car',
      totalMinutes: 30,
      steps: [{ title: 'Walk around', text: para('Look for uneven gaps.'), media: null, alt: '' }],
    },
  },
  {
    type: 'timeline',
    props: {
      items: [{ date: '2019', title: 'First registered', text: para('Imported from Germany.') }],
    },
  },
  {
    type: 'pros-cons',
    props: { prosTitle: 'Pros', consTitle: 'Cons', pros: ['Cheap to run'], cons: ['Small boot'] },
  },
  {
    type: 'stats',
    props: { items: [{ value: '14 500 €', label: 'Average price', trend: 'down', note: '' }] },
  },
  {
    type: 'rating',
    props: {
      title: 'Our verdict',
      scale: 5,
      score: 4,
      itemName: 'VW Golf 2019',
      summary: para('A safe choice.'),
      criteria: [{ label: 'Comfort', score: 4 }],
    },
  },
  {
    type: 'author',
    props: {
      name: 'Arben Hoxha',
      role: 'Editor',
      bio: para('Writes about cars.'),
      links: [{ label: 'Site', href: 'https://example.com' }],
    },
  },
  {
    type: 'section',
    props: { background: 'muted' },
    children: [
      { type: 'heading', props: { level: 2, text: para('Ready to sell?') } },
      {
        type: 'columns',
        props: { layout: '1-1' },
        children: [
          {
            type: 'column',
            props: { span: 6 },
            children: [{ type: 'paragraph', props: { text: para('Left column') } }],
          },
          {
            type: 'column',
            props: { span: 6 },
            children: [{ type: 'paragraph', props: { text: para('Right column') } }],
          },
        ],
      },
    ],
  },
  {
    type: 'container',
    props: { width: 'wide' },
    children: [{ type: 'paragraph', props: { text: para('Wide text') } }],
  },
  { type: 'group', props: {}, children: [{ type: 'paragraph', props: { text: para('Grouped') } }] },
  { type: 'spacer', props: { size: 'lg' } },
  { type: 'divider', props: { variant: 'dots' } },
  {
    type: 'cta',
    props: {
      title: 'Get a valuation',
      text: para('Free, in two minutes.'),
      buttons: [
        {
          label: 'Start',
          href: '/valuation',
          variant: 'primary',
          icon: 'arrow-right',
          newTab: false,
        },
      ],
    },
  },
  {
    type: 'buttons',
    props: {
      buttons: [
        { label: 'Contact us', href: '/contact', variant: 'outline', icon: 'mail', newTab: false },
      ],
    },
  },
  { type: 'related', props: { title: 'Read next', mode: 'auto', count: 3 } },
  {
    type: 'newsletter',
    props: { title: 'Stay in the loop', placeholder: 'you@example.com', button: 'Subscribe' },
  },
  {
    type: 'accordion',
    props: {},
    children: [
      {
        type: 'accordion-item',
        props: { title: 'Warranty' },
        children: [{ type: 'paragraph', props: { text: para('Twelve months.') } }],
      },
    ],
  },
  {
    type: 'tabs',
    props: {},
    children: [
      {
        type: 'tab-item',
        props: { title: 'Petrol' },
        children: [{ type: 'paragraph', props: { text: para('Quieter.') } }],
      },
      {
        type: 'tab-item',
        props: { title: 'Diesel' },
        children: [{ type: 'paragraph', props: { text: para('Thriftier.') } }],
      },
    ],
  },
  { type: 'disclaimer', props: { text: para('Prices are indicative.') } },
];

export function kitchenSinkDocument(registry: ElementRegistry): ArticleDocument {
  const doc = createArticleDocument({
    title: 'Buying a used car in 2026',
    excerpt: 'Everything to check before you buy, from the service book to the test drive.',
    cover: { media: SAMPLE_MEDIA('cover'), alt: 'A row of used cars' },
  });

  const build = (spec: Spec): NodeId => {
    // A spec with explicit children is built without the element's own
    // starting children, then filled with the spec's.
    const fragment = createFragment(registry, spec.type, spec.props ?? {});
    const [rootId] = fragment.roots;
    if (rootId === undefined) throw new Error(`Could not build ${spec.type}`);
    const node = fragment.nodes[rootId];
    if (!node) throw new Error(`Could not build ${spec.type}`);
    if (spec.children) {
      node.children = spec.children.map(build);
      Object.assign(doc.nodes, { [rootId]: node });
    } else {
      Object.assign(doc.nodes, fragment.nodes);
    }
    return rootId;
  };

  const roots = SPECS.map(build);
  doc.nodes[doc.root] = { id: doc.root, type: 'root', v: 1, props: {}, children: roots };
  return renumber(doc);
}

/** Ids `n1…nN` in document order, for byte-stable fixtures. */
export function renumber(doc: ArticleDocument): ArticleDocument {
  const map = new Map<NodeId, NodeId>([[doc.root, doc.root]]);
  const visit = (id: NodeId) => {
    for (const child of doc.nodes[id]?.children ?? []) {
      map.set(child, `n${String(map.size)}`);
      visit(child);
    }
  };
  visit(doc.root);
  const nodes: Record<NodeId, BuilderNode> = {};
  for (const [oldId, newId] of map) {
    const node = doc.nodes[oldId];
    if (!node) continue;
    nodes[newId] = {
      ...node,
      id: newId,
      ...(node.children ? { children: node.children.map((child) => map.get(child) ?? child) } : {}),
    };
  }
  return { ...doc, nodes };
}
