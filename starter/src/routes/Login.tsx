import { type FormEvent, useState } from 'react';
import HandleTypeahead from '../components/HandleTypeahead';
import { useSession } from '../lib/session';

/**
 * Login screen — built to match design/Best Favorite First Hi-Fi.dc.html (Login tab).
 * See DESIGN_SPEC.md § "1. Login" for full visual spec and exact tokens.
 */
export default function Login() {
  const { signIn } = useSession();
  const [handle, setHandle] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const h = handle.trim().replace(/^@/, '');
    if (!h) return;
    setPending(true);
    setError(null);
    try {
      await signIn(h); // redirects away on success; only returns if it throws
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not reach that server. Check your handle and try again.',
      );
      setPending(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      background: 'var(--page-bg)',
    }}>
      <div style={{ width: 392, maxWidth: '100%' }}>

        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {(['var(--best)', 'var(--fav)', 'var(--first)']).map((bg, i) => (
              <span key={i} style={{
                width: 22, height: 22, borderRadius: 6, background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--on-brand)', fontSize: 11,
              }}>{'★♥①'[i]}</span>
            ))}
          </div>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 30,
            lineHeight: 1, color: 'var(--ink)',
          }}>BFF</span>
        </div>

        {/* Card */}
        <div style={{
          border: '1px solid var(--hairline)',
          borderRadius: 20,
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-elevated)',
          padding: '30px 28px',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 30,
            lineHeight: 1.1,
            marginBottom: 5,
          }}>
            Tag the albums<br />that matter.
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
            Sign in with your handle on any AT&nbsp;Protocol server.
          </div>

          <form onSubmit={handleSubmit}>
            <label style={{
              display: 'block', fontSize: 13, fontWeight: 600,
              color: 'var(--ink-2)', marginBottom: 7,
            }}>Your handle</label>

            <div style={{
              display: 'flex', alignItems: 'center',
              border: `1.5px solid ${error ? 'var(--fav)' : 'var(--ink)'}`,
              borderRadius: 'var(--r-input)',
              // Positions the handle dropdown; no overflow clipping so it can
              // hang below the field (the @ addon rounds its own corners).
              position: 'relative',
              marginBottom: error ? 8 : 16, background: '#fff',
            }}>
              <span style={{
                padding: '11px 12px',
                background: 'var(--page-bg)',
                borderRadius: 'calc(var(--r-input) - 1.5px) 0 0 calc(var(--r-input) - 1.5px)',
                borderRight: '1.5px solid var(--hairline-2)',
                fontFamily: 'var(--font-mono)', fontSize: 15,
                color: 'var(--muted)', flexShrink: 0,
              }}>@</span>
              <HandleTypeahead value={handle} onChange={setHandle} disabled={pending} />
            </div>

            {error && (
              <div style={{
                marginBottom: 12, fontSize: 13,
                color: 'var(--fav)', fontWeight: 500,
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={pending || !handle.trim()}
              style={{
                width: '100%', fontSize: 16, fontWeight: 600,
                padding: 13, background: 'var(--ink)', color: 'var(--page-bg)',
                border: 'none', borderRadius: 'var(--r-input)',
                cursor: pending ? 'default' : 'pointer',
                marginBottom: 13,
                opacity: (!handle.trim() || pending) ? 0.55 : 1,
                transition: 'opacity .15s',
              }}
            >
              {pending ? 'Connecting…' : 'Continue →'}
            </button>
          </form>

          {/* Advanced option */}
          <div style={{
            textAlign: 'center', fontSize: 14, color: 'var(--muted)',
            cursor: 'pointer', textDecoration: 'underline', marginBottom: 18,
          }}>
            Use a custom server (PDS)
            {/* TODO: show a second input for the PDS URL */}
          </div>

          <div style={{
            fontSize: 12, color: 'var(--faint)', lineHeight: 1.6,
            borderTop: '1px solid var(--divider)', paddingTop: 15,
          }}>
            Bluesky or your own server — we redirect you there to sign in.
            We never see your password.
          </div>
        </div>

        {/* Guest mode (future) */}
        <div style={{
          textAlign: 'center', fontSize: 14,
          color: 'var(--faint)', marginTop: 18, opacity: 0.5,
        }}>
          Browse without signing in ›
          {/* TODO: implement guest / preview mode or remove */}
        </div>
      </div>
    </div>
  );
}
