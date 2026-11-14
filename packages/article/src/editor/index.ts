/**
 * @builderset/article/editor — the article builder: the shared editor
 * (`@builderset/engine/editor`) with the article profile.
 */

export { ArticleEditor, type ArticleEditorProps } from './editor';
export { articleProfile, type ArticleProfileOptions } from './profile';
export { useArticle, useArticleFacts, type ArticleFacts } from './hooks';
export {
  useArticleWords,
  type ArticleLocale,
  type ArticleMessages,
  type ArticleWords,
} from './words';
export { ARTICLE_TEMPLATES } from './templates';
export { DocumentSettings, SettingsFieldRow } from './document-settings';
export { TitleField } from './title-field';
export {
  SETTINGS_FIELDS,
  type ArticleSettingsOptions,
  type SettingsField,
  type SettingsSection,
  type SettingsTab,
} from './settings';
