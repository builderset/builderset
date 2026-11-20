import { error, type BuilderNode, type Issue } from '@builderset/engine';
import { defineElement } from '@builderset/engine';
import { z } from 'zod';

import { FIELD_PARENTS, inputDefaults, inputIssues, inputShape } from './common';

/**
 * Choice fields: pick from a list (dropdown, one, several), yes or no, stars,
 * a score from 0 to 10, a value on a slider.
 */

const options = () => z.array(z.string().max(200)).min(1).max(60);
const defaultOptions = () => ['Option 1', 'Option 2', 'Option 3'];

/** One or several choices: a list, buttons in a row, or cards. */
export const OPTION_LAYOUTS = ['list', 'buttons', 'cards'] as const;

/** A list of choices needs two that say something. */
function optionIssues(props: { options: string[] }, node: BuilderNode): Issue[] {
  return props.options.filter((option) => option.trim()).length < 2
    ? [error('field.optionsMissing', { nodeId: node.id, path: 'options' })]
    : [];
}

export const selectField = defineElement({
  type: 'select',
  version: 1,
  category: 'choice',
  icon: 'chevrons-up-down',
  keywords: ['dropdown', 'pick', 'menu', 'list'],
  schema: z.object({ ...inputShape, options: options(), defaultValue: z.string().max(200) }),
  defaults: () => ({
    ...inputDefaults('Choose one', 'choice'),
    options: defaultOptions(),
    defaultValue: '',
  }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => [...inputIssues(props, node), ...optionIssues(props, node)],
});

export const radioField = defineElement({
  type: 'radio',
  version: 1,
  category: 'choice',
  icon: 'circle-dot',
  keywords: ['single choice', 'one of', 'option'],
  schema: z.object({
    ...inputShape,
    options: options(),
    layout: z.enum(OPTION_LAYOUTS),
    defaultValue: z.string().max(200),
  }),
  defaults: () => ({
    ...inputDefaults('Choose one', 'choice'),
    options: defaultOptions(),
    layout: 'list' as const,
    defaultValue: '',
  }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => [...inputIssues(props, node), ...optionIssues(props, node)],
});

export const checkboxField = defineElement({
  type: 'checkbox',
  version: 1,
  category: 'choice',
  icon: 'square-check',
  keywords: ['multiple choice', 'several', 'tick', 'interests'],
  schema: z.object({ ...inputShape, options: options(), layout: z.enum(OPTION_LAYOUTS) }),
  defaults: () => ({
    ...inputDefaults('Choose any', 'choices'),
    options: defaultOptions(),
    layout: 'list' as const,
  }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => [...inputIssues(props, node), ...optionIssues(props, node)],
});

export const yesNoField = defineElement({
  type: 'yes-no',
  version: 1,
  category: 'choice',
  icon: 'toggle-right',
  keywords: ['boolean', 'yes', 'no', 'toggle'],
  schema: z.object(inputShape),
  defaults: () => inputDefaults('Yes or no?', 'yes_no'),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => inputIssues(props, node),
});

export const ratingField = defineElement({
  type: 'rating',
  version: 1,
  category: 'choice',
  icon: 'star',
  keywords: ['stars', 'score', 'review'],
  schema: z.object({ ...inputShape, stars: z.union([z.literal(3), z.literal(5), z.literal(10)]) }),
  defaults: () => ({ ...inputDefaults('How would you rate it?', 'rating'), stars: 5 as const }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => inputIssues(props, node),
});

export const scaleField = defineElement({
  type: 'scale',
  version: 1,
  category: 'choice',
  icon: 'gauge',
  keywords: ['nps', 'net promoter', 'likely', '0 to 10'],
  schema: z.object({
    ...inputShape,
    from: z.union([z.literal(0), z.literal(1)]),
    to: z.union([z.literal(5), z.literal(7), z.literal(10)]),
    /** Under the lowest and the highest number. */
    lowLabel: z.string().max(60),
    highLabel: z.string().max(60),
  }),
  defaults: () => ({
    ...inputDefaults('How likely are you to recommend us?', 'score'),
    from: 0 as const,
    to: 10 as const,
    lowLabel: 'Not at all',
    highLabel: 'Very likely',
  }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => inputIssues(props, node),
});

export const sliderField = defineElement({
  type: 'slider',
  version: 1,
  category: 'choice',
  icon: 'sliders-horizontal',
  keywords: ['range', 'amount', 'budget'],
  schema: z.object({
    ...inputShape,
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    defaultValue: z.number(),
    unit: z.string().max(12),
  }),
  defaults: () => ({
    ...inputDefaults('How much?', 'amount'),
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 50,
    unit: '',
  }),
  parents: FIELD_PARENTS,
  toPlainText: (props) => props.label,
  check: (props, { node }) => [
    ...inputIssues(props, node),
    ...(props.min >= props.max
      ? [error('field.rangeInvalid', { nodeId: node.id, path: 'max' })]
      : []),
  ],
});

export const choiceFields = [
  selectField,
  radioField,
  checkboxField,
  yesNoField,
  ratingField,
  scaleField,
  sliderField,
];
