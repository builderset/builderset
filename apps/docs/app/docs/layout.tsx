import type { ReactNode } from 'react';

import { DocsShell } from '@/components/docs/shell';
import { navigation, VERSION } from '@/lib/nav';
import { gitConfig } from '@/lib/shared';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsShell
      groups={navigation()}
      version={VERSION}
      github={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
    >
      {children}
    </DocsShell>
  );
}
