import Layout from '../components/Layout';
import { useSession } from '../lib/session';

/**
 * Profile — the signed-in user's picks, grouped as trios per artist or by tag.
 *
 * Build this screen to match:
 *   design/Best Favorite First Hi-Fi.dc.html → "Profile" tab
 *
 * See DESIGN_SPEC.md § "4. Profile" for full spec.
 *
 * Data: listMyPicks(agent) from src/lib/pick.ts — then group:
 *   "By artist" → Map<artistKey, { best?, favorite?, first? }> → trio cards
 *   "By tag"    → partition by kind → three horizontal rails
 *
 * The "By artist / By tag" segmented control is local UI state (no URL param needed).
 */
export default function Profile() {
  const { session } = useSession();

  return (
    <Layout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
        <div style={{
          width: 84, height: 84, borderRadius: '50%', flexShrink: 0,
          background: '#E7D7B8', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontFamily: 'var(--font-display)',
          fontSize: 38, color: 'var(--ink-2)',
        }}>
          {(session?.handle?.[0] ?? 'Y').toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 38,
            lineHeight: .95, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            @{session?.handle ?? '…'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 5 }}>
            Load stats from <code>listMyPicks()</code>
          </div>
        </div>
        <button style={{
          fontSize: 15, fontWeight: 600, padding: '9px 18px',
          background: 'var(--surface)', border: '1px solid var(--hairline-2)',
          borderRadius: 'var(--r-input)', cursor: 'pointer', color: 'var(--ink)',
          flexShrink: 0,
        }}>Edit picks</button>
      </div>

      <div style={{
        border: '1.5px dashed var(--hairline-2)',
        borderRadius: 'var(--r-card-lg)',
        padding: '40px 32px',
        textAlign: 'center',
        color: 'var(--faint)',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 24,
          color: 'var(--ink-2)', marginBottom: 8,
        }}>Trios — build me</div>
        <div style={{ fontSize: 15, marginBottom: 12 }}>
          "By artist": 2-col grid of trio cards (Best / Favorite / First per artist).<br />
          "By tag": three horizontal rails (Your Bests, Your Favorites, Your Firsts).<br />
          Data: <code>listMyPicks(agent)</code> grouped accordingly.
        </div>
        <div style={{
          display: 'inline-block',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--faint)', background: 'var(--ctrl-bg)',
          padding: '4px 10px', borderRadius: 6,
        }}>DESIGN_SPEC.md § 4 · Hi-Fi.dc.html → Profile tab</div>
      </div>
    </Layout>
  );
}
