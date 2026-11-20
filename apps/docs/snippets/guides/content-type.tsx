import { standardElements, type ArticleDocument } from '@builderset/article';
import { ArticleEditor, SettingsFieldRow, type SettingsSection } from '@builderset/article/editor';
import type { BuilderHost } from '@builderset/article/host';
import { ElementRegistry } from '@builderset/engine';
import { useState } from 'react';

// #region elements
/** A job post: text and lists only — no video, no embeds, no tables. */
const ALLOWED = new Set(['root', 'section', 'heading', 'paragraph', 'list', 'callout', 'divider']);
export const jobPostRegistry = new ElementRegistry(
  standardElements.filter((element) => ALLOWED.has(element.type)),
);
// #endregion elements

// #region fields
/** The job post's own columns, in Document settings, beside the built-in fields. */
function useJobFields(): SettingsSection[] {
  const [salary, setSalary] = useState('');
  return [
    {
      id: 'salary',
      tab: 'general',
      render: () => (
        <SettingsFieldRow label="Salary range">
          {(id) => (
            <input
              id={id}
              value={salary}
              onChange={(event) => {
                setSalary(event.target.value);
              }}
            />
          )}
        </SettingsFieldRow>
      ),
    },
  ];
}
// #endregion fields

export function JobPostEditor(props: {
  document: ArticleDocument;
  host: BuilderHost<ArticleDocument>;
}) {
  const sections = useJobFields();
  const [record, setRecord] = useState({
    status: 'draft',
    scheduledAt: null as string | null,
    publishedAt: null as string | null,
    slug: 'senior-mechanic',
    locale: 'en',
  });
  return (
    <ArticleEditor
      document={props.document}
      host={props.host}
      registry={jobPostRegistry}
      record={record}
      onRecordChange={(patch) => {
        setRecord((current) => ({ ...current, ...patch }));
      }}
      settingsSections={sections}
      onBack={() => {
        history.back();
      }}
    />
  );
}
