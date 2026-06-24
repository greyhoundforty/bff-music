import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';

/**
 * Artist page — "Set your three" for a specific artist.
 *
 * Build this screen to match:
 *   design/Best Favorite First Hi-Fi.dc.html → "Artist page" tab, "Slots" tool
 *
 * See DESIGN_SPEC.md § "3. Artist" for full spec.
 *
 * Route param: `artistKey` — the deterministic artist key (mbid:… or name:…).
 * Use it to filter the signed-in user's picks for this artist and drive the slots.
 *
 * Primary tool: "Set your three" — three slot cards (Best / Favorite / First).
 * Each filled slot shows cover + album title; empty slots show a drop target.
 * Writing a pick: putPick({ artist, album, kind }) — uses putRecord (overwrite).
 * Below the slots: the full discography for the artist (sourced from your catalog).
 *
 * Two alternate tools documented in DESIGN_SPEC.md: toggles and guided flow.
 */
export default function Artist() {
  const { artistKey } = useParams<{ artistKey: string }>();

  return (
    <Layout>
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          letterSpacing: '2px', color: 'var(--faint)',
          textTransform: 'uppercase', marginBottom: 4,
        }}>
          Artist
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 56,
          lineHeight: .92, marginBottom: 6,
        }}>
          {artistKey ?? '—'}
        </div>
        <div style={{ fontSize: 15, color: 'var(--muted)' }}>
          Resolve artist name + discography from catalog (MusicBrainz or similar)
          using this key.
        </div>
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
        }}>Set your three — build me</div>
        <div style={{ fontSize: 15, marginBottom: 12 }}>
          Three slot cards (Best ★ / Favorite ♥ / First ①) + discography grid below.
          Writes via <code>putPick()</code> in src/lib/pick.ts.
        </div>
        <div style={{
          display: 'inline-block',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--faint)', background: 'var(--ctrl-bg)',
          padding: '4px 10px', borderRadius: 6,
        }}>DESIGN_SPEC.md § 3 · Hi-Fi.dc.html → Artist page → Slots</div>
      </div>
    </Layout>
  );
}
