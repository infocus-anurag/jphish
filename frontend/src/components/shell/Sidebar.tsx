'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { I, type IconKey } from '@/components/ui/Icons';
import { isRouteAllowed, type RouteId } from '@/lib/rbac';
import { usePersona, usePersonaInfo } from '@/store/session.store';
import { useAuthStore } from '@/store/auth.store';
import { listCampaigns } from '@/lib/api/campaigns';

interface NavItem {
  id: RouteId;
  href: string;
  label: string;
  icon: IconKey;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operate',
    items: [
      { id: 'dashboard', href: '/', label: 'Dashboard', icon: 'dashboard' },
      {
        id: 'campaigns',
        href: '/campaigns',
        label: 'Campaigns',
        icon: 'campaigns',
      },
      {
        id: 'adaptive',
        href: '/adaptive',
        label: 'Adaptive engine',
        icon: 'adaptive',
      },
      { id: 'alerts', href: '/alerts', label: 'Alerts', icon: 'alerts' },
    ],
  },
  {
    label: 'Library',
    items: [
      {
        id: 'templates',
        href: '/templates',
        label: 'Email templates',
        icon: 'templates',
      },
      {
        id: 'landing',
        href: '/landing',
        label: 'Landing pages',
        icon: 'landing',
      },
      { id: 'training', href: '/training', label: 'Training', icon: 'training' },
      {
        id: 'domains',
        href: '/domains',
        label: 'Domains & DNS',
        icon: 'domains',
      },
    ],
  },
  {
    label: 'People',
    items: [
      { id: 'users', href: '/users', label: 'Users', icon: 'users' },
      { id: 'groups', href: '/groups', label: 'Target groups', icon: 'users' },
      { id: 'reports', href: '/reports', label: 'Reports', icon: 'reports' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { id: 'users', href: '/users/admin', label: 'Roles & access', icon: 'shield' },
      { id: 'settings', href: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

const SUPER_GROUP: NavGroup = {
  label: 'Platform',
  items: [
    { id: 'tenants', href: '/tenants', label: 'Tenants', icon: 'building' },
  ],
};

export function Sidebar(): JSX.Element {
  const pathname = usePathname();
  const persona = usePersona();
  const personaInfo = usePersonaInfo();
  const role = useAuthStore((s) => s.user?.role);

  // Live campaign count for the nav badge (shares cache with Campaigns/Dashboard).
  const { data: campaignData } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => listCampaigns({ take: 200 }),
    enabled: !!role,
    staleTime: 30_000,
  });
  const navCount = (id: RouteId): number | undefined =>
    id === 'campaigns' ? campaignData?.total : undefined;

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const groups: NavGroup[] = persona === 'super'
    ? [SUPER_GROUP, ...NAV_GROUPS]
    : NAV_GROUPS;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-name">JPhish</div>
        <div className="sidebar-brand-meta">v1.2</div>
      </div>
      <nav className="sidebar-nav">
        {groups.map((g) => {
          const visible = g.items.filter((it) => isRouteAllowed(role, it.id));
          if (visible.length === 0) return null;
          return (
            <div key={g.label}>
              <div className="nav-section-label">{g.label}</div>
              {visible.map((it) => {
                const Ic = I[it.icon];
                const active = isActive(it.href);
                const count = navCount(it.id);
                return (
                  <Link
                    key={it.id}
                    href={it.href}
                    className={`nav-item ${active ? 'active' : ''}`}
                  >
                    <span className="nav-item-icon">
                      <Ic size={14} />
                    </span>
                    <span>{it.label}</span>
                    {count != null && count > 0 && (
                      <span className="nav-item-count">{count}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="sidebar-foot">
        <div className="sidebar-foot-avatar">{personaInfo.initials}</div>
        <div style={{ minWidth: 0 }}>
          <div className="sidebar-foot-name">{personaInfo.name}</div>
          <div className="sidebar-foot-role">{personaInfo.role}</div>
        </div>
        <button type="button" className="sidebar-foot-action" aria-label="Account">
          <I.chev size={13} />
        </button>
      </div>
    </aside>
  );
}
