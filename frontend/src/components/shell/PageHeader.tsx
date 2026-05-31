'use client';

import type { ReactNode } from 'react';

export interface PageHeaderTab {
  id: string;
  label: ReactNode;
  count?: number;
}

export function PageHeader({
  title,
  sub,
  actions,
  tabs,
  activeTab,
  onTab,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  tabs?: PageHeaderTab[];
  activeTab?: string;
  onTab?: (id: string) => void;
}): JSX.Element {
  return (
    <div className="page-head">
      <div className="page-head-row">
        <div>
          <h1 className="page-title">{title}</h1>
          {sub && <p className="page-sub">{sub}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
      {tabs && (
        <div className="tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => onTab?.(t.id)}
            >
              {t.label}
              {t.count != null && <span className="tab-count">{t.count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
