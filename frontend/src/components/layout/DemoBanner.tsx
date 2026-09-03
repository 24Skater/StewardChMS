// The demo credentials are configuration, not constants: the platform root
// domain is a deployment decision, and the banner must always show whatever
// the demo seed actually created. See docs/PLATFORM.md.
export function DemoBanner() {
  if (import.meta.env.VITE_DEMO_MODE !== 'true') return null

  const demoEmail = import.meta.env.VITE_DEMO_ADMIN_EMAIL || 'admin@demo.example.com'
  const demoPassword = import.meta.env.VITE_DEMO_ADMIN_PASSWORD || 'Demo1234!'

  return (
    <div
      role="note"
      aria-label="Demo environment notice"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#0D1B2E',
        color: '#E8B847',
        textAlign: 'center',
        padding: '6px 16px',
        fontSize: '0.8125rem',
        fontWeight: 500,
        letterSpacing: '0.01em',
      }}
    >
      <strong>Demo environment</strong> — Pre-loaded with sample data. Resets nightly at{' '}
      <strong>1 AM UTC</strong>. Credentials:{' '}
      <code style={{ color: '#F5EED8' }}>{demoEmail}</code> /{' '}
      <code style={{ color: '#F5EED8' }}>{demoPassword}</code>
    </div>
  )
}
