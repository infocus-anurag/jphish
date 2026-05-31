import type { Metadata } from 'next';
import { AppProviders } from '@/lib/providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'JPhish — Phishing Simulation Platform',
  description:
    'Plan, approve, and monitor phishing simulations across your organization.',
  keywords: ['phishing', 'security', 'awareness', 'training', 'simulation'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
