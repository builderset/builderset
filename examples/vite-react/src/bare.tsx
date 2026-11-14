import { createRoot } from 'react-dom/client';
import './page.css';

/** The page's own button, without the editor's stylesheet: what it looks like untouched. */
createRoot(document.getElementById('root') as HTMLElement).render(
  <main className="page">
    <button type="button" className="page-button" data-page-button="">
      A button of the page's own
    </button>
  </main>,
);
