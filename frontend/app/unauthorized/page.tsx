import Link from 'next/link';

export default function UnauthorizedPage(): JSX.Element {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg)',
        color: 'var(--fg)',
        padding: 24,
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: 'var(--fg-subtle)',
            marginBottom: 8,
          }}
        >
          403 · Forbidden
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          You don&apos;t have access to this view
        </h1>
        <p
          style={{
            color: 'var(--fg-muted)',
            fontSize: 13,
            marginTop: 8,
          }}
        >
          Your current role can&apos;t open this page. Switch personas from the
          sidebar tweaks panel, or ask an Org Admin for the right permissions.
        </p>
        <Link
          href="/"
          className="btn primary"
          style={{ marginTop: 18, display: 'inline-flex' }}
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
