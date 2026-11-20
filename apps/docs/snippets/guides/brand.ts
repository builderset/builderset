import type { BrandKit } from '@builderset/email/render';

/**
 * A mail client cannot read your CSS, so an email is painted with real values.
 * A template stores names (`brand.primary`); the brand kit holds the values.
 * Store it as one JSON value, and pass the same object to the editor and to
 * renderEmail: change it once and every template follows.
 */
export const brand: BrandKit = {
  name: 'Acme',
  website: 'https://acme.example',
  // Shown in the footer; many countries require a postal address in marketing email.
  address: 'Street 1, City',
  logo: { key: 'brand/logo.png', width: 240, height: 64 },
  logoDark: null,
  colors: {
    primary: '#111827',
    secondary: '#374151',
    accent: '#2563eb',
    text: '#1f2937',
    muted: '#6b7280',
    background: '#f4f4f5',
    surface: '#ffffff',
    border: '#e5e7eb',
  },
  social: [{ network: 'instagram', href: 'https://instagram.com/acme' }],
};
