import type { DeepPartial, EditorMessages, ElementText } from '@builderset/engine/editor';

import type { FormWords } from '../render';

/**
 * Everything the form builder says, in one language: the shared workspace's
 * words (with the form's own where it says them differently — "Publish
 * changes", "Live"), the field names, the form's panels, and the words its
 * visitors read (`visitor`).
 */
export interface FormLocale {
  code: string;
  engine: EditorMessages;
  workspace: Partial<EditorMessages>;
  elements: Record<string, ElementText>;
  categories: Record<string, string>;
  form: FormEditorWords;
  visitor: FormWords;
}

/** Replace single words, in whatever language is active. */
export type FormMessages = DeepPartial<FormLocale>;

/** What the form panels pass around. */
export interface FormKitWords {
  form: FormEditorWords;
  visitor: FormWords;
}

// #region editor-words
export interface FormEditorWords {
  // Settings tabs
  general: string;
  submit: string;
  rules: string;
  style: string;
  // General
  name: string;
  nameHint: string;
  address: string;
  copyLink: string;
  copied: string;
  languages: string;
  steps: string;
  stepsHint: (count: number) => string;
  progressBar: string;
  progressNumbers: string;
  progressNone: string;
  buttonSubmit: string;
  buttonNext: string;
  buttonBack: string;
  markFields: string;
  markRequired: string;
  markOptional: string;
  markBoth: string;
  saveProgress: string;
  saveProgressHint: string;
  prefill: string;
  prefillHint: string;
  // Submit
  afterSubmit: string;
  afterMessage: string;
  afterRedirect: string;
  afterBoth: string;
  messageTitle: string;
  message: string;
  messageHint: string;
  pageAddress: string;
  redirectHint: string;
  emails: string;
  emailsHint: string;
  autoReply: string;
  autoReplyHint: string;
  noEmailField: string;
  sendTo: string;
  fromName: string;
  replyTo: string;
  subject: string;
  body: string;
  insertAnswer: string;
  team: string;
  teamHint: (count: number) => string;
  teamOff: string;
  addRecipient: string;
  webhook: string;
  webhookHint: string;
  // Rules
  spam: string;
  captcha: string;
  captchaOff: string;
  captchaInvisible: string;
  captchaCheckbox: string;
  captchaHint: Record<'off' | 'invisible' | 'checkbox', string>;
  honeypot: string;
  honeypotHint: string;
  blockDisposable: string;
  blockDisposableHint: string;
  rateLimit: string;
  rateLimitHint: string;
  limits: string;
  oncePer: string;
  oncePerNone: string;
  oncePerEmail: string;
  oncePerPhone: string;
  oncePerDevice: string;
  maxResponses: string;
  maxResponsesHint: string;
  noLimit: string;
  opens: string;
  closes: string;
  closedMessage: string;
  privacy: string;
  keepFor: string;
  months: (count: number) => string;
  forever: string;
  storeIp: string;
  storeIpHint: string;
  // Style
  look: string;
  lookLight: string;
  lookDark: string;
  lookWarm: string;
  width: string;
  narrow: string;
  medium: string;
  wide: string;
  labels: string;
  labelsTop: string;
  labelsLeft: string;
  labelsInside: string;
  fieldSize: string;
  corners: string;
  accent: string;
  font: string;
  fullWidthButtons: string;
  fullWidthButtonsHint: string;
  // Canvas
  addStep: string;
  stepTitle: string;
  stepNumber: (index: number) => string;
  fieldCount: (count: number) => string;
  emptyStep: string;
  emptyStepHint: string;
  addField: string;
  titlePlaceholder: string;
  introPlaceholder: string;
  // Dock
  previousStep: string;
  nextStep: string;
  stepOfDock: (step: number, total: number) => string;
  testAnswers: string;
  // Field inspector
  fieldTab: string;
  checksTab: string;
  logicTab: string;
  moreTab: string;
  required: string;
  requiredOn: string;
  requiredOff: string;
  requiredLocked: string;
  label: string;
  placeholder: string;
  help: string;
  helpHint: string;
  widthFull: string;
  widthHalf: string;
  widthHint: string;
  options: string;
  addOption: string;
  pasteList: string;
  pasteHint: string;
  useList: string;
  optionsAs: string;
  layoutList: string;
  layoutButtons: string;
  layoutCards: string;
  stars: string;
  scaleFrom: string;
  scaleTo: string;
  lowLabel: string;
  highLabel: string;
  min: string;
  max: string;
  step: string;
  startsAt: string;
  unit: string;
  prefix: string;
  rows: string;
  accept: string;
  acceptHint: string;
  maxFiles: string;
  maxMb: string;
  consentText: string;
  linkText: string;
  linkUrl: string;
  text: string;
  image: string;
  alt: string;
  value: string;
  defaultAnswer: string;
  fieldType: string;
  fieldTypeHint: string;
  lockedTitle: (template: string) => string;
  lockedBody: (reason: string) => string;
  protectedTitle: string;
  protectedBody: string;
  // Checks
  minLength: string;
  maxLength: string;
  lowest: string;
  highest: string;
  pickAtLeast: string;
  pickAtMost: string;
  format: string;
  formatNone: string;
  formatLetters: string;
  formatDigits: string;
  formatCustom: string;
  pattern: string;
  errorMessage: string;
  errorMessageHint: string;
  errorPreview: string;
  nothingToCheck: string;
  // Logic
  showWhen: string;
  showWhenHint: string;
  matchAll: string;
  matchAny: string;
  when: string;
  and: string;
  or: string;
  ops: Record<'is' | 'is_not' | 'contains' | 'empty' | 'not_empty' | 'gt' | 'lt', string>;
  addRule: string;
  noEarlierFields: string;
  logicSummary: (rules: string, required: boolean) => string;
  usedBy: string;
  usedByNone: string;
  // More
  key: string;
  keyHint: string;
  keyLocked: string;
  fillFromLink: string;
  fillFromLinkHint: string;
  readonly: string;
  readonlyHint: string;
  hideFromVisitors: string;
  hideFromVisitorsHint: string;
  protect: string;
  protectHint: string;
  protectLocked: string;
  position: string;
  positionHint: (step: number, field: number, of: number) => string;
  moveToStep: string;
  // Step panel
  stepFields: (count: number) => string;
  deleteStep: string;
  deleteStepHint: string;
  // Responses
  responses: string;
  total: string;
  thisWeek: string;
  completion: string;
  averageTime: string;
  latest: string;
  noResponses: string;
  noResponsesHint: string;
  // Share
  share: string;
  shareTitle: string;
  link: string;
  embed: string;
  linkLabel: string;
  prefilledLink: string;
  prefilledHint: string;
  embedLabel: string;
  embedHint: string;
  copy: string;
  // Templates
  templateNeeds: (labels: string) => string;
  /** The dock's numbers: "8 fields · 3 steps". */
  summary: (fields: number, steps: number) => string;
}
// #endregion editor-words
