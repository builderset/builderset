import type { MetadataRoute } from 'next';

/** For "Add to home screen" and installed tabs: the mark on an ink tile. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Builderset Docs',
    short_name: 'Docs',
    description: "How to put Builderset's email and article editors into your project.",
    start_url: '/docs',
    display: 'browser',
    background_color: '#ffffff',
    theme_color: '#10131a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
