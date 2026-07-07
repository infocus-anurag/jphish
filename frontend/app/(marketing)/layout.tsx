import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './landing.css';

export const metadata: Metadata = {
  title: 'Infocus-IT — Enterprise Phishing Simulation Platform',
  description:
    'Create phishing campaigns, realistic landing pages, email templates, and automated user targeting — all from one multi-tenant platform.',
};

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return <>{children}</>;
}
