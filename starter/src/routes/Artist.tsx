import { useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { useSession } from '../lib/session';
import { putPick } from '../lib/pick';
import { getArtistAlbums, toArtistRef, toAlbumRef, type RockskyArtist, type RockskyAlbum } from '../lib/rocksky';
import type { PickKind } from '../lib/types';

export default function Artist() {
  const { artistKey } = useParams<{ artistKey: string }>();
  const { state } = useLocation() as { state?: { artist?: RockskyArtist } };
  const { session } = useSession();

  const rockskyUri = state?.artist?.uri ?? null;
  const artistName = state?.artist?.name ?? artistKey?.replace(/^name:/, '').replace(/-/g, ' ') ?? '—';

  const albumsQuery = useQuery({
    queryKey: ['artist-albums', rockskyUri],
    queryFn: () => getArtistAlbums(rockskyUri!, 60),
    enabled: !!rockskyUri,
    staleTime: 5 * 60_000,
  });

  async function handlePick(album: RockskyAlbum, kind: PickKind) {
    if (!session || !state?.artist) return;
    const artist = toArtistRef(state.artist);
    await putPick(session.agent, { kind, artist, album: toAlbumRef(album) });
  }

  return (
    <Layout>
      {/* ── Artist header ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 36 }}>
        {state?.artist?.picture && (
          <img src={state.artist.picture} alt="" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
        )}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '2px', color: 'var(--faint)', textTransform: 'uppercase', marginBottom: 4 }}>Artist</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 46, lineHeight: 0.95 }}>{artistName}</div>
        </div>
      </div>

      {/* ── Pick slots stub ─────────────────────────────────────────────── */}
      <div style={{ border: '1.5px dashed var(--hairline-2)', borderRadius: 'var(--r-card-lg)', padding: '24px 28px', marginBottom: 36, textAlign: 'center', color: 'var(--faint)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink-2)', marginBottom: 6 }}>Set your three — build me next</div>
        <div style={{ fontSize: 14 }}>Best ★ / Favorite ♥ / First ① slot cards go here (DESIGN_SPEC.md § 3)</div>
      </div>

      {/* ── Discography ─────────────────────────────────────────────────── */}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, marginBottom: 16 }}>Discography</div>

      {!rockskyUri && (
        <div style={{ color: 'var(--faint)', fontSize: 14 }}>
          Search for this artist using the top nav to load their discography.
        </div>
      )}

      {albumsQuery.isLoading && <div style={{ color: 'var(--faint)', fontSize: 14 }}>Loading albums…</div>}

      {albumsQuery.isError && (
        <div style={{ color: 'var(--fav)', fontSize: 14 }}>
          Couldn't load albums: {(albumsQuery.error as Error).message}
        </div>
      )}

      {albumsQuery.data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {albumsQuery.data.map(album => (
            <AlbumCard key={album.id} album={album} onPick={handlePick} />
          ))}
        </div>
      )}
    </Layout>
  );
}

// ── Album card ────────────────────────────────────────────────────────────────

function AlbumCard({ album, onPick }: { album: RockskyAlbum; onPick: (a: RockskyAlbum, k: PickKind) => void }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
      {album.albumArt
        ? <img src={album.albumArt} alt={album.title} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
        : <div style={{ width: '100%', aspectRatio: '1', background: 'var(--ctrl-bg)' }} />
      }
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.title}</div>
        <div style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 10 }}>{album.year}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['best', 'favorite', 'first'] as PickKind[]).map(kind => {
            const [label, color] = kind === 'best' ? ['★', 'var(--best)'] : kind === 'favorite' ? ['♥', 'var(--fav)'] : ['①', 'var(--first)'];
            return (
              <button
                key={kind}
                onClick={() => onPick(album, kind)}
                title={`Mark as ${kind}`}
                style={{
                  flex: 1, border: 'none', borderRadius: 6, background: 'var(--page-bg)',
                  color, fontSize: 13, cursor: 'pointer', padding: '5px 0',
                  fontWeight: 600,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
