import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchArtists, toArtistRef, type MBArtist } from '../lib/musicbrainz';
import { artistKey } from '../lib/pick';

export default function ArtistSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MBArtist[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); setActiveIndex(-1); return; }
    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const hits = await searchArtists(query, 8);
        setResults(hits);
        setOpen(hits.length > 0);
        setActiveIndex(-1);
      } catch {
        setResults([]);
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  function select(artist: MBArtist) {
    const ref = toArtistRef(artist);
    const key = artistKey(ref);
    setQuery('');
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
    navigate(`/artist/${key}`, { state: { artist } });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      select(results[activeIndex]);
    }
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
          onKeyDown={handleKeyDown}
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
          {results.map((artist, idx) => (
            <button
              key={artist.id}
              onClick={() => select(artist)}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(-1)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', border: 'none',
                background: idx === activeIndex ? 'var(--page-bg)' : 'none',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                background: 'var(--best)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--on-brand)',
              }}>
                {artist.name[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{artist.name}</div>
                {artist.disambiguation && (
                  <div style={{ fontSize: 12, color: 'var(--faint)' }}>{artist.disambiguation}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
