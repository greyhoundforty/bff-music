import { type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../lib/session';
import ArtistSearch from './ArtistSearch';

/**
 * Top bar + content wrapper shared by all authed screens.
 * See DESIGN_SPEC.md § "Global chrome — Top bar" for the exact visual spec.
 * Active nav underline, search behaviour, and the full Search UI are TODO.
 */
export default function Layout({ children }: { children: ReactNode }) {
  const { session, signOut } = useSession();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const initial = (session?.handle?.[0] ?? 'Y').toUpperCase();

  return (
    <div>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'rgba(241,234,221,.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--hairline-2)',
      }}>
        <div style={{
          maxWidth: 'var(--content-max)', margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 20,
          padding: '13px 28px',
        }}>
          {/* Wordmark */}
          <Link to="/" style={{ display:'flex', alignItems:'center', gap:11, textDecoration:'none' }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {(['var(--best)', 'var(--fav)', 'var(--first)']).map((bg, i) => (
                <span key={i} style={{
                  width: 21, height: 21, borderRadius: 6, background: bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--on-brand)', fontSize: 11,
                }}>{'★♥①'[i]}</span>
              ))}
            </div>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 27,
              lineHeight: 1, color: 'var(--ink)',
            }}>BFF</span>
          </Link>

          {/* Nav — TODO: add active underline per DESIGN_SPEC.md */}
          <nav style={{ display: 'flex', gap: 2, marginLeft: 10 }}>
            {([['/', 'Discover'], ['/artist/explore', 'Artists'], ['/you', 'You']] as const).map(
              ([to, label]) => (
                <Link key={to} to={to} style={{
                  fontSize: 15, fontWeight: 500, color: 'var(--ink-2)',
                  textDecoration: 'none', padding: '7px 12px', display: 'block',
                }}>{label}</Link>
              ),
            )}
          </nav>

          <div style={{ flex: 1 }} />

          {/* Search */}
          <ArtistSearch />

          {/* Sign out */}
          <button onClick={handleSignOut} style={{
            fontSize: 13, color: 'var(--faint)', background: 'none',
            border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
          }}>Sign out</button>

          {/* Avatar → Profile */}
          <Link to="/you" style={{
            width: 38, height: 38, borderRadius: '50%', background: '#E7D7B8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink-2)',
            textDecoration: 'none', flexShrink: 0,
          }}>{initial}</Link>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <main style={{
        maxWidth: 'var(--content-max)', margin: '0 auto',
        padding: '34px 28px 90px',
      }}>
        {children}
      </main>
    </div>
  );
}
