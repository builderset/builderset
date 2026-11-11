/**
 * @motors/article/editor — the article builder: the shared editor
 * (`@motors/engine/editor`) with the article profile.
 */

export { ArticleEditor, type ArticleEditorProps } from './editor';
export { articleProfile, type ArticleProfileOptions } from './profile';
export { useArticle, useArticleFacts, type ArticleFacts } from './hooks';
export { ARTICLE_TEMPLATES } from './templates';
export { DocumentSettings } from './document-settings';
export { TitleField } from './title-field';
