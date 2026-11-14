import type { Settings } from './settings';

/**
 * On every route: the theme, the page's own dark class, the editor's language
 * and a brand colour — and how many saves reached the host.
 */
export function Bar({
  settings,
  onChange,
  saves,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  saves: number;
}) {
  return (
    <div className="example-bar" data-example-bar="" data-saves={saves}>
      <label>
        Language{' '}
        <select
          value={settings.lang}
          onChange={(e) => {
            onChange({ ...settings, lang: e.target.value as Settings['lang'] });
          }}
        >
          <option value="en">en</option>
          <option value="sq">sq</option>
          <option value="de">de</option>
        </select>
      </label>
      <label>
        Theme{' '}
        <select
          value={settings.theme}
          onChange={(e) => {
            onChange({ ...settings, theme: e.target.value as Settings['theme'] });
          }}
        >
          <option value="light">light</option>
          <option value="dark">dark</option>
          <option value="auto">auto</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={settings.pageDark}
          onChange={(e) => {
            onChange({ ...settings, pageDark: e.target.checked });
          }}
        />{' '}
        page .dark
      </label>
      <label>
        Brand{' '}
        <input
          type="color"
          value={settings.primary || '#2b5fd9'}
          onChange={(e) => {
            onChange({ ...settings, primary: e.target.value });
          }}
        />
      </label>
      <span>saves: {saves}</span>
    </div>
  );
}
