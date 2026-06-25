import { useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { useSession } from '../lib/session';
import { putPick } from '../lib/pick';
import { getArtistReleaseGroups, toArtistRef, toAlbumRef, coverUrl, type MBArtist, type MBReleaseGroup } from '../lib/musicbrainz';
import type { PickKind } from '../lib/types';

type DiscographyFilter = 'studio' | 'all';

export default function Artist() {
  const { artistKey } = useParams<{ artistKey: string }>();
  const { state } = useLocation() as { state?: { artist?: MBArtist } };
  const { session } = useSession();

  const [filter, setFilter] = useState<DiscographyFilter>('studio');

  const mbid = state?.artist?.id ?? null;
  const artistName = state?.artist?.name ?? artistKey?.replace(/^name:/, '').replace(/-/g, ' ') ?? '—';

  const albumsQuery = useQuery({
    queryKey: ['artist-albums', mbid],
    queryFn: () => getArtistReleaseGroups(mbid!, 100),
    enabled: !!mbid,
    staleTime: 5 * 60_000,
  });

  async function handlePick(album: MBReleaseGroup, kind: PickKind) {
    if (!session || !state?.artist) return;
    const artist = toArtistRef(state.artist);
    try {
      await putPick(session.agent, { kind, artist, album: toAlbumRef(album) });
    } catch (err) {
      console.error('[BFF] putPick failed:', err);
    }
  }

  return (
    <Layout>
      {/* ── Artist header ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 36 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '2px', color: 'var(--faint)', textTransform: 'uppercase', marginBottom: 4 }}>Artist</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 46, lineHeight: 0.95 }}>{artistName}</div>
          {state?.artist?.disambiguation && (
            <div style={{ fontSize: 14, color: 'var(--faint)', marginTop: 6 }}>{state.artist.disambiguation}</div>
          )}
        </div>
      </div>

      {/* ── Pick slots stub ─────────────────────────────────────────────── */}
      <div style={{ border: '1.5px dashed var(--hairline-2)', borderRadius: 'var(--r-card-lg)', padding: '24px 28px', marginBottom: 36, textAlign: 'center', color: 'var(--faint)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--ink-2)', marginBottom: 6 }}>Set your three — build me next</div>
        <div style={{ fontSize: 14 }}>Best ★ / Favorite ♥ / First ① slot cards go here (DESIGN_SPEC.md § 3)</div>
      </div>

      {/* ── Discography ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 26 }}>Discography</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {([['studio', 'Albums & EPs'], ['all', 'Singles & more']] as [DiscographyFilter, string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                fontFamily: 'var(--font-ui)', fontWeight: 500,
                border: '1px solid var(--hairline)',
                background: filter === v ? 'var(--ink)' : 'transparent',
                color: filter === v ? 'var(--page-bg)' : 'var(--ink-2)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!mbid && (
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

      {albumsQuery.data && (() => {
        const displayed = filter === 'studio'
          ? albumsQuery.data.filter(rg => rg.primaryType === 'Album' || rg.primaryType === 'EP')
          : albumsQuery.data;
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
            {displayed.map(album => (
              <AlbumCard key={album.id} album={album} onPick={handlePick} />
            ))}
          </div>
        );
      })()}
    </Layout>
  );
}

// ── Album card ────────────────────────────────────────────────────────────────

function AlbumCard({ album, onPick }: { album: MBReleaseGroup; onPick: (a: MBReleaseGroup, k: PickKind) => void }) {
  const imgSrc = coverUrl(album.id);
  const year = album.firstReleaseDate?.slice(0, 4) ?? '';
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
      <img
        src={imgSrc}
        alt={album.title}
        style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.title}</div>
        <div style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 10 }}>{year}</div>
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
