import Layout from '../components/Layout';

/**
 * Discover — "What people are naming" (the home feed).
 *
 * Build this screen to match:
 *   design/Best Favorite First Hi-Fi.dc.html → "Discover" tab, "columns" layout
 *
 * See DESIGN_SPEC.md § "2. Discover" for exact layout, tokens, and component specs.
 *
 * Primary layout: three columns (Best ★ / Favorite ♥ / First ①), one card per
 * recent pick from people you follow. Data: listMyPicks() across followed accounts
 * (follows-merge for v1; AppView for scale — see ARCHITECTURE.md).
 *
 * Two alternate layouts are documented in DESIGN_SPEC.md: grid and timeline.
 * Build columns first.
 */
export default function Discover() {
  return (
    <Layout>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 11,
        letterSpacing: '2px', color: 'var(--faint)',
        textTransform: 'uppercase', marginBottom: 4,
      }}>
        What people are naming
      </div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 46,
        lineHeight: .95, marginBottom: 32,
      }}>
        Discover
      </div>

      <Stub
        title="Three-column feed — build me"
        detail="Best ★ / Favorite ♥ / First ① columns of picks from people you follow."
        spec="DESIGN_SPEC.md § 2 · Hi-Fi.dc.html → Discover → columns"
      />
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Stub({ title, detail, spec }: { title: string; detail: string; spec: string }) {
  return (
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
      }}>{title}</div>
      <div style={{ fontSize: 15, marginBottom: 12 }}>{detail}</div>
      <div style={{
        display: 'inline-block',
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--faint)', background: 'var(--ctrl-bg)',
        padding: '4px 10px', borderRadius: 6,
      }}>{spec}</div>
    </div>
  );
}
