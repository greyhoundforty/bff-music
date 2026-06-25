import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { useSession } from '../lib/session';
import { listMyPicks } from '../lib/pick';
import type { PickRecord, PickKind } from '../lib/types';

interface ArtistTrio {
  artistKeyStr: string;
  name: string;
  best?: PickRecord;
  favorite?: PickRecord;
  first?: PickRecord;
}

const KIND_META: Record<PickKind, { glyph: string; color: string; label: string }> = {
  best:     { glyph: '★', color: 'var(--best)',  label: 'Best' },
  favorite: { glyph: '♥', color: 'var(--fav)',   label: 'Favorite' },
  first:    { glyph: '①', color: 'var(--first)', label: 'First' },
};

export default function Profile() {
  const { session } = useSession();
  const [view, setView] = useState<'artist' | 'kind'>('artist');

  const picksQuery = useQuery({
    queryKey: ['my-picks', session?.did],
    queryFn: () => listMyPicks(session!.agent),
    enabled: !!session,
    staleTime: 30_000,
  });

  const picks = picksQuery.data ?? [];

  const artistTrios = useMemo((): ArtistTrio[] => {
    const map = new Map<string, ArtistTrio>();
    for (const pick of picks) {
      const rkey = pick.uri.split('/').pop() ?? '';
      const artistKeyStr = rkey.slice(0, rkey.lastIndexOf('.'));
      if (!map.has(artistKeyStr)) {
        map.set(artistKeyStr, { artistKeyStr, name: pick.value.artist.name });
      }
      map.get(artistKeyStr)![pick.value.kind] = pick;
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [picks]);

  const byKind = useMemo(() => ({
    best:     picks.filter(p => p.value.kind === 'best'),
    favorite: picks.filter(p => p.value.kind === 'favorite'),
    first:    picks.filter(p => p.value.kind === 'first'),
  }), [picks]);

  const initial = (session?.handle?.[0] ?? 'Y').toUpperCase();

  return (
    <Layout>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 32 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
          background: '#E7D7B8', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontFamily: 'var(--font-display)',
          fontSize: 34, color: 'var(--ink-2)',
        }}>{initial}</div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, lineHeight: 0.95 }}>
            @{session?.handle ?? '…'}
          </div>
          {picks.length > 0 && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)', marginTop: 6, letterSpacing: '0.5px' }}>
              {byKind.best.length} best · {byKind.favorite.length} favorite · {byKind.first.length} first
            </div>
          )}
        </div>
      </div>

      {/* ── View toggle ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {(['artist', 'kind'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '5px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontWeight: 500,
            border: '1px solid var(--hairline)',
            background: view === v ? 'var(--ink)' : 'transparent',
            color: view === v ? 'var(--page-bg)' : 'var(--ink-2)',
          }}>
            {v === 'artist' ? 'By artist' : 'By kind'}
          </button>
        ))}
      </div>

      {/* ── Loading / empty ───────────────────────────────────────────────── */}
      {picksQuery.isLoading && (
        <div style={{ color: 'var(--faint)', fontSize: 14 }}>Loading your picks…</div>
      )}

      {!picksQuery.isLoading && picks.length === 0 && (
        <div style={{ color: 'var(--faint)', fontSize: 14 }}>
          No picks yet — search for an artist and set your Best, Favorite, and First.
        </div>
      )}

      {/* ── By artist ─────────────────────────────────────────────────────── */}
      {view === 'artist' && artistTrios.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {artistTrios.map(trio => <TrioCard key={trio.artistKeyStr} trio={trio} />)}
        </div>
      )}

      {/* ── By kind ───────────────────────────────────────────────────────── */}
      {view === 'kind' && picks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {(['best', 'favorite', 'first'] as PickKind[]).map(kind => {
            const meta = KIND_META[kind];
            const kindPicks = byKind[kind];
            if (kindPicks.length === 0) return null;
            return (
              <div key={kind}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 6, background: meta.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--on-brand)', fontSize: 11, flexShrink: 0,
                  }}>{meta.glyph}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>
                    Your {meta.label}s
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
                  {kindPicks.map(pick => <RailCard key={pick.uri} pick={pick} kind={kind} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}

// ── Trio card (by-artist view) ────────────────────────────────────────────────

function TrioCard({ trio }: { trio: ArtistTrio }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-card-lg)', padding: '14px 16px',
      boxShadow: 'var(--shadow-card)',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink)',
        marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{trio.name}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {(['best', 'favorite', 'first'] as PickKind[]).map(kind => {
          const meta = KIND_META[kind];
          const pick = trio[kind];
          return (
            <div key={kind} style={{
              background: 'var(--page-bg)', borderRadius: 8,
              overflow: 'hidden', border: '1px solid var(--hairline)',
            }}>
              {pick ? (
                <>
                  {pick.value.album?.coverUrl && (
                    <img
                      src={pick.value.album.coverUrl}
                      alt={pick.value.album.title}
                      style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 16, height: 16, borderRadius: 4, background: meta.color,
                      color: 'var(--on-brand)', fontSize: 9, marginBottom: 4,
                    }}>{meta.glyph}</div>
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: 'var(--ink)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{pick.value.album?.title ?? '—'}</div>
                    {pick.value.album?.year && (
                      <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 1 }}>
                        {pick.value.album.year}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{
                  aspectRatio: '1', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'var(--faint)', fontSize: 18,
                }}>{meta.glyph}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Rail card (by-kind view) ──────────────────────────────────────────────────

function RailCard({ pick, kind }: { pick: PickRecord; kind: PickKind }) {
  const meta = KIND_META[kind];
  return (
    <div style={{
      flexShrink: 0, width: 130,
      background: 'var(--surface)', border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)',
    }}>
      {pick.value.album?.coverUrl && (
        <img
          src={pick.value.album.coverUrl}
          alt={pick.value.album.title}
          style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div style={{ padding: '8px 10px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 16, borderRadius: 4, background: meta.color,
          color: 'var(--on-brand)', fontSize: 9, marginBottom: 4,
        }}>{meta.glyph}</div>
        <div style={{
          fontSize: 12, fontWeight: 600, color: 'var(--ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{pick.value.album?.title ?? '—'}</div>
        <div style={{
          fontSize: 11, color: 'var(--muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1,
        }}>{pick.value.artist.name}</div>
      </div>
    </div>
  );
}
