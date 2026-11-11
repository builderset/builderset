import { detectEmbedProvider, EMBED_ASPECT, type EmbedProvider } from '../core/embeds';

/**
 * The iframe address for an embed, BUILT from the id it contains.
 *
 * The writer's URL is never put in an iframe as-is: the provider is recognised
 * from the allow-list, the one identifier the embed needs is pulled out with a
 * pattern that only matches identifier characters, and the embed URL is
 * assembled from the provider's own endpoint and that identifier. A URL that
 * yields no identifier yields no iframe — the renderer falls back to a plain
 * link. YouTube goes through its no-cookie domain.
 */

export interface EmbedSource {
  provider: EmbedProvider;
  src: string;
  aspect: number;
}

const pick = (pattern: RegExp, url: string): string | null => pattern.exec(url)?.[1] ?? null;

export function embedSource(url: string): EmbedSource | null {
  const provider = detectEmbedProvider(url);
  if (!provider) return null;
  const aspect = EMBED_ASPECT[provider];
  const make = (src: string | null): EmbedSource | null => (src ? { provider, src, aspect } : null);

  switch (provider) {
    case 'youtube': {
      const id =
        pick(/[?&]v=([\w-]{6,20})/, url) ??
        pick(/youtu\.be\/([\w-]{6,20})/, url) ??
        pick(/\/(?:shorts|embed)\/([\w-]{6,20})/, url);
      return make(id ? `https://www.youtube-nocookie.com/embed/${id}` : null);
    }
    case 'vimeo': {
      const id = pick(/vimeo\.com\/(?:video\/)?(\d{3,15})/, url);
      return make(id ? `https://player.vimeo.com/video/${id}?dnt=1` : null);
    }
    case 'x': {
      const id = pick(/\/status\/(\d{5,25})/, url);
      return make(id ? `https://platform.twitter.com/embed/Tweet.html?id=${id}&dnt=true` : null);
    }
    case 'instagram': {
      const match = /instagram\.com\/(p|reel|tv)\/([\w-]{3,40})/.exec(url);
      return make(
        match ? `https://www.instagram.com/${match[1] ?? 'p'}/${match[2] ?? ''}/embed` : null,
      );
    }
    case 'tiktok': {
      const id = pick(/\/video\/(\d{5,25})/, url);
      return make(id ? `https://www.tiktok.com/embed/v2/${id}` : null);
    }
    case 'spotify': {
      const match =
        /open\.spotify\.com\/(track|album|playlist|episode|show)\/([A-Za-z0-9]{10,40})/.exec(url);
      return make(
        match ? `https://open.spotify.com/embed/${match[1] ?? ''}/${match[2] ?? ''}` : null,
      );
    }
    case 'google-maps': {
      // Only a URL that carries coordinates can be turned into an embed
      // without asking Google; a short link is shown as a plain link.
      const coordinates = /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/.exec(url);
      if (!coordinates) return null;
      const place = `${coordinates[1] ?? ''},${coordinates[2] ?? ''}`;
      return make(`https://maps.google.com/maps?q=${encodeURIComponent(place)}&z=15&output=embed`);
    }
  }
}

export const PROVIDER_NAMES: Record<EmbedProvider, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  x: 'X',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  spotify: 'Spotify',
  'google-maps': 'Google Maps',
};
