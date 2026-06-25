import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { useSession } from '../lib/session';
import { fetchFollowsPicks, groupPicksByKind, type AuthoredPick } from '../lib/discover';
import { getTopAlbums, type RockskyAlbum } from '../lib/rocksky';

const KIND_META = {
  best:     { label: 'Best',     glyph: '★', color: 'var(--best)',  tint: 'var(--best-tint)',  ink: 'var(--best-ink)',  caption: 'the peak' },
  favorite: { label: 'Favorite', glyph: '♥', color: 'var(--fav)',   tint: 'var(--fav-tint)',   ink: 'var(--fav-ink)',   caption: 'yours' },
  first:    { label: 'First',    glyph: '①', color: 'var(--first)', tint: 'var(--first-tint)', ink: 'var(--first-ink)', caption: 'start here' },
} as const;

export default function Discover() {
  const { session } = useSession();

  const trendingQuery = useQuery({
    queryKey: ['rocksky-trending'],
    queryFn: () => getTopAlbums(30),
    staleTime: 5 * 60_000,
  });

  const picksQuery = useQuery({
    queryKey: ['discover-feed', session?.did],
    queryFn: () => fetchFollowsPicks(session!.agent, session!.did),
    enabled: !!session,
    staleTime: 60_000,
  });

  const grouped = picksQuery.data ? groupPicksByKind(picksQuery.data) : null;

  return (
    <Layout>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '2px', color: 'var(--faint)', textTransform: 'uppercase', marginBottom: 4 }}>
        What people are naming
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 46, lineHeight: 0.95, marginBottom: 32 }}>
        Discover
      </div>

      {/* ── Trending on Rocksky ───────────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24 }}>Trending on Rocksky</div>
          {trendingQuery.isLoading && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>loading…</span>
          )}
        </div>

        {trendingQuery.isError && (
          <div style={{ color: 'var(--fav)', fontSize: 14 }}>
            Couldn't load Rocksky charts: {(trendingQuery.error as Error).message}
          </div>
        )}

        {trendingQuery.data && (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {trendingQuery.data.map(album => (
              <TrendingCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </section>

      {/* ── Picks from Rocksky follows ────────────────────────────────────── */}
      <section>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 16 }}>
          Picks from people you follow
        </div>

        {picksQuery.isLoading && (
          <div style={{ color: 'var(--faint)', fontSize: 14 }}>Checking your Rocksky follows…</div>
        )}

        {picksQuery.isError && (
          <div style={{ color: 'var(--fav)', fontSize: 14 }}>
            Couldn't load follows: {(picksQuery.error as Error).message}
          </div>
        )}

        {grouped && picksQuery.data && picksQuery.data.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {(['best', 'favorite', 'first'] as const).map(kind => {
              const meta = KIND_META[kind];
              const picks = grouped[kind];
              return (
                <div key={kind}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 6, background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-brand)', fontSize: 12, flexShrink: 0 }}>{meta.glyph}</span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, lineHeight: 1 }}>{meta.label}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--faint)', letterSpacing: '1px' }}>{meta.caption.toUpperCase()}</div>
                    </div>
                  </div>
                  {picks.length === 0 && (
                    <div style={{ fontSize: 13, color: 'var(--faint)', padding: '12px 0' }}>
                      No {meta.label.toLowerCase()} picks yet.
                    </div>
                  )}
                  {picks.map(ap => <PickCard key={ap.pick.uri} ap={ap} kind={kind} />)}
                </div>
              );
            })}
          </div>
        )}

        {grouped && picksQuery.data?.length === 0 && (
          <div style={{ fontSize: 14, color: 'var(--faint)', lineHeight: 1.6 }}>
            None of your Rocksky follows have BFF picks yet — this will fill in as the community grows.
            {/* TODO(AppView): replace with app.bff.getDiscoverFeed once an AppView is live */}
          </div>
        )}
      </section>
    </Layout>
  );
}

// ── Trending card ─────────────────────────────────────────────────────────────

function TrendingCard({ album }: { album: RockskyAlbum }) {
  return (
    <div style={{
      flexShrink: 0, width: 148,
      background: 'var(--surface)', border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)',
    }}>
      {album.albumArt
        ? <img src={album.albumArt} alt={album.title} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
        : <div style={{ width: '100%', aspectRatio: '1', background: 'var(--ctrl-bg)' }} />
      }
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.title}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{album.artist}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--faint)', marginTop: 4 }}>
          {album.uniqueListeners.toLocaleString()} listeners
        </div>
      </div>
    </div>
  );
}

// ── Pick card ─────────────────────────────────────────────────────────────────

function PickCard({ ap, kind }: { ap: AuthoredPick; kind: keyof typeof KIND_META }) {
  const meta = KIND_META[kind];
  const { pick, authorHandle, authorAvatar } = ap;
  const { album, artist, note, createdAt } = pick.value;

  const timeAgo = (() => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  })();

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-card)', padding: '12px 14px', marginBottom: 10, boxShadow: 'var(--shadow-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {album.coverUrl
          ? <img src={album.coverUrl} alt="" style={{ width: 52, height: 52, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 52, height: 52, borderRadius: 6, background: meta.tint, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.ink, fontSize: 20 }}>{meta.glyph}</div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.title}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist.name}</div>
        </div>
      </div>
      {note && <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 8, lineHeight: 1.4 }}>{note}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        {authorAvatar
          ? <img src={authorAvatar} alt="" style={{ width: 16, height: 16, borderRadius: '50%' }} />
          : <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--ctrl-bg)' }} />
        }
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>@{authorHandle} · {timeAgo}</span>
      </div>
    </div>
  );
}
