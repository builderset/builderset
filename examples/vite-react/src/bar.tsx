import type { Settings } from './settings';

/** On every route: the theme, the page's own dark class and a brand colour. */
export function Bar({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
}) {
  return (
    <div className="example-bar" data-example-bar="">
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
    </div>
  );
}
