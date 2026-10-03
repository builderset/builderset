/**
 * @motors/email-core — the email builder's model.
 *
 * Pure TypeScript on top of `@motors/builder-core`'s tree, operations and
 * history: the email document (subject, preheader, settings), its blocks and
 * layout rules, variables with conditions and loops, and validation — for the
 * editor, the renderer and the server alike.
 */

export * from './blocks';
export * from './document';
export * from './fields';
export * from './fonts';
export * from './import-html';
export * from './json-schema';
export * from './limits';
export * from './rich-text';
export * from './sample';
export * from './validate';
export * from './variables';
export * from './designs/newsletter';
export * from './designs/verification-code';
export * from './designs/application-received';
export * from './designs/valuation-offer';
export * from './designs/job-application-received';
export * from './designs/partner-application-received';
export * from './designs/contact-received';
export * from './designs/staff-notification';
