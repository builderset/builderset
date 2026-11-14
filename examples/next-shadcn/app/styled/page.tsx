// The same page as /, with the editor's stylesheet imported: the project's
// own buttons must look exactly the same (a browser test compares them).
import 'builderset/styles.css';

import { Home } from '@/components/home';

export default function Page() {
  return <Home />;
}
