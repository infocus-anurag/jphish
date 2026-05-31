'use client';

import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { PersonaRibbon } from './PersonaRibbon';
import { CommandPalette } from './CommandPalette';
import { NotifPanel } from './NotifPanel';
import { ToastHost } from './ToastHost';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { TweaksPanel } from './TweaksPanel';
import { WizardHost } from './WizardHost';

export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Topbar />
        <PersonaRibbon />
        <div className="main-body">{children}</div>
      </main>
      <KeyboardShortcuts />
      <CommandPalette />
      <NotifPanel />
      <WizardHost />
      <ToastHost />
      <TweaksPanel />
    </div>
  );
}
