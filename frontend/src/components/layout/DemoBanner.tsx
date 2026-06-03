export function DemoBanner() {
  if (import.meta.env.VITE_DEMO_MODE !== 'true') return null

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
      <code style={{ color: '#F5EED8' }}>admin@demo.steward.app</code> /{' '}
      <code style={{ color: '#F5EED8' }}>Demo1234!</code>
    </div>
  )
}
