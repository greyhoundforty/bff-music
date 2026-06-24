import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchArtists, toArtistRef, type RockskyArtist } from '../lib/rocksky';
import { artistKey } from '../lib/pick';

export default function ArtistSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RockskyArtist[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const hits = await searchArtists(query, 8);
        setResults(hits);
        setOpen(hits.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  function select(artist: RockskyArtist) {
    const ref = toArtistRef(artist);
    const key = artistKey(ref);
    setQuery('');
    setResults([]);
    setOpen(false);
    navigate(`/artist/${key}`, {
      state: { rockskyUri: artist.uri, picture: artist.picture, name: artist.name },
    });
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9,
        background: 'var(--surface)', border: '1px solid var(--hairline-2)',
        borderRadius: 'var(--r-input)', padding: '9px 13px',
        minWidth: 248,
      }}>
        <span style={{ color: 'var(--faint)' }}>⌖</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="search artists, albums, people"
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--ink)',
            minWidth: 0,
          }}
        />
        {loading && <span style={{ fontSize: 11, color: 'var(--faint)' }}>…</span>}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-card)', boxShadow: 'var(--shadow-elevated)',
          overflow: 'hidden',
        }}>
          {results.map(artist => (
            <button
              key={artist.id}
              onClick={() => select(artist)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', border: 'none', background: 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--page-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {artist.picture && (
                <img
                  src={artist.picture}
                  alt=""
                  style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                />
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{artist.name}</div>
                <div style={{ fontSize: 12, color: 'var(--faint)' }}>{artist.uniqueListeners.toLocaleString()} listeners</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
