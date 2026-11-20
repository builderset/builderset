/**
 * @builderset/form/render — a form as React, for a public page.
 *
 * `FormView` is the working form: steps, logic, checks, the thank-you
 * message. The pieces it is drawn from (`FieldControl`, `FieldBox`,
 * `FormProgress`, …) are exported too, for a page that lays a form out its
 * own way. Load `@builderset/form/form.css` beside it. On the server, check
 * what arrives with `validateAnswers` from `@builderset/form`.
 */

export { FieldControl, isBoxed, type FieldControlProps } from './controls';
export { FormView, type FormSubmission, type FormViewProps } from './form-view';
export { FieldBox, FormHeader, FormProgress, Marker, Thanks, type FieldBoxProps } from './parts';
export { formClassName, formStyle, type FormDevice } from './style';
export { de, en, errorText, formWords, sq, type FormWords } from './words';
