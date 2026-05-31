'use client';

import { Fragment } from 'react';
import { usePathname } from 'next/navigation';
import { I } from '@/components/ui/Icons';
import { useSession, usePersonaInfo } from '@/store/session.store';
import { useUI } from '@/store/ui.store';
import { useCan } from '@/lib/rbac';
import { AccountMenu } from './AccountMenu';

const ROUTE_LABEL: Record<string, string> = {
  '/': 'Dashboard',
  '/campaigns': 'Campaigns',
  '/adaptive': 'Adaptive engine',
  '/alerts': 'Alerts',
  '/templates': 'Email templates',
  '/landing': 'Landing pages',
  '/training': 'Training',
  '/domains': 'Domains & DNS',
  '/users': 'Users & groups',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/tenants': 'Tenants',
};

export function Topbar(): JSX.Element {
  const pathname = usePathname();
  const theme = useSession((s) => s.theme);
  const setTheme = useSession((s) => s.setTheme);
  const personaInfo = usePersonaInfo();
  const togglePalette = useUI((s) => s.togglePalette);
  const toggleNotif = useUI((s) => s.toggleNotif);
  const openWizard = useUI((s) => s.openWizard);
  const canCreateCampaign = useCan('campaign.create');

  const label = ROUTE_LABEL[pathname] ?? 'Dashboard';
  const crumbs = [personaInfo.org, label];

  return (
    <div className="topbar">
      <div className="topbar-crumbs">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <span className="sep">
                <I.chevR size={12} />
              </span>
            )}
            <span className={`crumb ${i === crumbs.length - 1 ? 'last' : ''}`}>
              {c}
            </span>
          </Fragment>
        ))}
      </div>
      <span className="spacer" />
      <button
        type="button"
        className="topbar-search"
        onClick={() => togglePalette(true)}
      >
        <I.search size={13} />
        <span>Search campaigns, users…</span>
        <kbd>⌘K</kbd>
      </button>
      <button
        type="button"
        className="topbar-action"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <I.sun size={14} /> : <I.moon size={14} />}
      </button>
      <button
        type="button"
        className="topbar-action"
        onClick={() => toggleNotif(true)}
        aria-label="Alerts"
      >
        <I.bell size={14} />
      </button>
      {canCreateCampaign && (
        <button type="button" className="btn primary" onClick={openWizard}>
          <I.plus size={13} /> New campaign
        </button>
      )}
      <AccountMenu />
    </div>
  );
}
