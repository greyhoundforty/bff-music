import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../lib/session';

/**
 * OAuth callback landing page.
 *
 * SessionProvider.init() runs on app mount and handles the OAuth code/state
 * in the URL automatically (it calls oauthClient.init() which completes the
 * PKCE exchange and persists the session). This component just waits for that
 * to finish, then navigates home. If something went wrong it falls back to /login.
 */
export default function Callback() {
  const { session, loading, initError } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate('/', { replace: true });
    }
  }, [session, loading, navigate]);

  const wordmark = (
    <div style={{ display: 'flex', gap: 3 }}>
      {([['#C2902F', '★'], ['#CC6B52', '♥'], ['#2E9E78', '①']] as const).map(
        ([bg, g]) => (
          <span key={g} style={{
            width: 22, height: 22, borderRadius: 6, background: bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--on-brand)', fontSize: 11,
          }}>{g}</span>
        ),
      )}
    </div>
  );

  if (!loading && (initError || !session)) {
    const msg = initError ?? 'The OAuth callback completed but no session was established. Check the browser console (F12 → Console) for [BFF] log lines.';
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        background: 'var(--page-bg)', fontFamily: 'var(--font-ui)', padding: '40px 24px',
      }}>
        {wordmark}
        <div style={{
          maxWidth: 520, background: 'var(--surface)', border: '1px solid var(--fav-bd)',
          borderRadius: 14, padding: '20px 24px',
        }}>
          <div style={{ fontWeight: 600, color: 'var(--fav)', marginBottom: 8 }}>
            Sign-in failed
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 12,
            color: 'var(--ink-2)', wordBreak: 'break-word', lineHeight: 1.6,
          }}>
            {msg}
          </div>
        </div>
        <a href="/login" style={{ fontSize: 14, color: 'var(--muted)' }}>← Try again</a>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: 'var(--page-bg)', fontFamily: 'var(--font-ui)', color: 'var(--faint)',
    }}>
      {wordmark}
      <span style={{ fontSize: 15 }}>Signing you in…</span>
    </div>
  );
}
