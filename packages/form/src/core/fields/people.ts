import { defineElement, error, isSafeUrl } from '@builderset/engine';
import { z } from 'zod';

import { FIELD_PARENTS, inputDefaults, inputIssues, inputShape } from './common';

/**
 * Fields about the person: their name (first and last), an address, their
 * consent, a signature, files they send.
 */

export const nameField = defineElement({
  type: 'name',
  version: 1,
  category: 'people',
  icon: 'id-card',
  keywords: ['full name', 'first name', 'last name', 'person'],
  schema: z.object(inputShape),
  defaults: () => inputDefaults('Your name', 'name'),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => inputIssues(props, node),
});

export const addressField = defineElement({
  type: 'address',
  version: 1,
  category: 'people',
  icon: 'map-pin',
  keywords: ['street', 'city', 'postcode', 'zip', 'location'],
  schema: z.object(inputShape),
  defaults: () => inputDefaults('Address', 'address'),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => inputIssues(props, node),
});

export const consentField = defineElement({
  type: 'consent',
  version: 1,
  category: 'people',
  icon: 'shield-check',
  keywords: ['gdpr', 'privacy', 'terms', 'agree', 'opt-in'],
  schema: z.object({
    ...inputShape,
    /** What the visitor agrees to, next to the box. */
    text: z.string().max(1000),
    /** These words in `text` link to `linkUrl`: "the privacy policy". */
    linkText: z.string().max(120),
    linkUrl: z.string().max(500),
  }),
  defaults: () => ({
    ...inputDefaults('Consent', 'consent'),
    required: true,
    text: 'I agree to the privacy policy.',
    linkText: 'privacy policy',
    linkUrl: '',
  }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.text,
  links: (props) => (props.linkUrl ? [props.linkUrl] : []),
  check: (props, { node }) => [
    ...inputIssues(props, node),
    ...(props.text.trim() ? [] : [error('consent.textMissing', { nodeId: node.id, path: 'text' })]),
    ...(props.linkUrl && !isSafeUrl(props.linkUrl)
      ? [error('url.unsafe', { nodeId: node.id, path: 'linkUrl' })]
      : []),
  ],
});

export const signatureField = defineElement({
  type: 'signature',
  version: 1,
  category: 'people',
  icon: 'signature',
  keywords: ['sign', 'autograph', 'agreement'],
  schema: z.object(inputShape),
  defaults: () => inputDefaults('Signature', 'signature'),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => inputIssues(props, node),
});

export const fileField = defineElement({
  type: 'file',
  version: 1,
  category: 'people',
  icon: 'upload',
  keywords: ['upload', 'attachment', 'photo', 'cv', 'document'],
  schema: z.object({
    ...inputShape,
    /** File extensions, lower case without the dot: `['jpg', 'png', 'pdf']`. */
    accept: z.array(z.string().regex(/^[a-z0-9]{1,8}$/)).max(20),
    maxFiles: z.number().int().min(1).max(20),
    maxMb: z.number().int().min(1).max(100),
  }),
  defaults: () => ({
    ...inputDefaults('Files', 'files'),
    accept: ['jpg', 'png', 'pdf'],
    maxFiles: 5,
    maxMb: 10,
  }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => inputIssues(props, node),
});

export const peopleFields = [nameField, addressField, consentField, signatureField, fileField];
