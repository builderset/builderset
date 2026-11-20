import { defineElement } from '@builderset/engine';
import { z } from 'zod';

import { FIELD_PARENTS, inputDefaults, inputIssues, inputShape } from './common';

/**
 * Basic fields: a short or long answer, an email, a phone number, a number, a
 * date, a time, a password. Each takes one text (or number) answer.
 */

const placeholder = () => z.string().max(200);

export const textField = defineElement({
  type: 'text',
  version: 1,
  category: 'basic',
  icon: 'type',
  keywords: ['short answer', 'input', 'single line'],
  schema: z.object({
    ...inputShape,
    placeholder: placeholder(),
    defaultValue: z.string().max(500),
  }),
  defaults: () => ({
    ...inputDefaults('Your answer', 'answer'),
    placeholder: '',
    defaultValue: '',
  }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => inputIssues(props, node),
});

export const textareaField = defineElement({
  type: 'textarea',
  version: 1,
  category: 'basic',
  icon: 'align-left',
  keywords: ['long answer', 'message', 'paragraph', 'comment'],
  schema: z.object({
    ...inputShape,
    placeholder: placeholder(),
    rows: z.number().int().min(2).max(16),
  }),
  defaults: () => ({ ...inputDefaults('Message', 'message'), placeholder: '', rows: 4 }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => inputIssues(props, node),
});

export const emailField = defineElement({
  type: 'email',
  version: 1,
  category: 'basic',
  icon: 'at-sign',
  keywords: ['email address', 'mail', 'contact'],
  schema: z.object({ ...inputShape, placeholder: placeholder() }),
  defaults: () => ({ ...inputDefaults('Email', 'email'), placeholder: 'name@example.com' }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => inputIssues(props, node),
});

export const phoneField = defineElement({
  type: 'phone',
  version: 1,
  category: 'basic',
  icon: 'phone',
  keywords: ['telephone', 'mobile', 'number', 'whatsapp'],
  schema: z.object({
    ...inputShape,
    placeholder: placeholder(),
    /** Shown before the number: `+355`. Empty: none. */
    prefix: z.string().max(8),
  }),
  defaults: () => ({ ...inputDefaults('Phone', 'phone'), placeholder: '', prefix: '' }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => inputIssues(props, node),
});

export const numberField = defineElement({
  type: 'number',
  version: 1,
  category: 'basic',
  icon: 'hash',
  keywords: ['amount', 'quantity', 'count', 'price', 'year'],
  schema: z.object({
    ...inputShape,
    placeholder: placeholder(),
    /** After the number: `km`, `€`. */
    unit: z.string().max(12),
    defaultValue: z.number().nullable(),
  }),
  defaults: () => ({
    ...inputDefaults('Number', 'number'),
    placeholder: '',
    unit: '',
    defaultValue: null,
  }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => inputIssues(props, node),
});

export const dateField = defineElement({
  type: 'date',
  version: 1,
  category: 'basic',
  icon: 'calendar',
  keywords: ['day', 'birthday', 'when'],
  schema: z.object(inputShape),
  defaults: () => inputDefaults('Date', 'date'),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => inputIssues(props, node),
});

export const timeField = defineElement({
  type: 'time',
  version: 1,
  category: 'basic',
  icon: 'clock',
  keywords: ['hour', 'when'],
  schema: z.object(inputShape),
  defaults: () => inputDefaults('Time', 'time'),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => inputIssues(props, node),
});

export const passwordField = defineElement({
  type: 'password',
  version: 1,
  category: 'basic',
  icon: 'key-round',
  keywords: ['secret', 'account', 'sign up'],
  schema: z.object({ ...inputShape, placeholder: placeholder() }),
  defaults: () => ({ ...inputDefaults('Password', 'password'), placeholder: '' }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => inputIssues(props, node),
});

export const basicFields = [
  textField,
  textareaField,
  emailField,
  phoneField,
  numberField,
  dateField,
  timeField,
  passwordField,
];
