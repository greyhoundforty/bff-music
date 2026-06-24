# Search & Discover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire live artist/album search via the Rocksky API and a real Discover feed drawn from people the signed-in user follows on AT Protocol and Rocksky.

**Architecture:** A thin typed `fetch` wrapper (`rocksky.ts`) calls `https://api.rocksky.app/xrpc/` directly from the browser (CORS: `*`). Artist search drives a debounced typeahead in the top nav; selecting an artist navigates to the Artist route and passes the Rocksky AT URI via Router `state`. The Discover feed fetches follows from both the AT Protocol graph and Rocksky graph, then pulls each follow's `app.bff.pick` records and renders them in three columns (Best / Favorite / First). TanStack Query handles all caching, deduplication, and stale-time.

**Tech Stack:** React 18, react-router-dom v6, @tanstack/react-query v5, @atproto/api, Rocksky XRPC API (`api.rocksky.app`), Vite, TypeScript strict, Vitest (added here)

## Global Constraints

- TypeScript strict mode — no `any`, no `// @ts-ignore`
- All Rocksky calls go through `src/lib/rocksky.ts` — no bare `fetch('api.rocksky.app/...')` in components
- All AT Protocol calls go through the `Agent` from `useSession()` — never import Agent directly in routes
- `src/lib/pick.ts` and `src/lib/types.ts` are the source of truth for BFF record shapes — do not duplicate types
- `artistKey` format stays `mbid:{uuid}` or `name:{slug}` — no Rocksky URIs in rkeys
- No backend invented — all calls are client-side
- Design tokens from `src/styles/tokens.css` for all inline styles — no hardcoded hex
- TanStack Query staleTime: 60 000 ms for Rocksky reads, 30 000 ms for AT Protocol reads (already set as default)
- Do not modify `lexicons/app/bff/pick.json` in this milestone

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/lib/rocksky.ts` | Typed XRPC client + response types for Rocksky |
| Create | `src/lib/discover.ts` | Merge follows' picks from AT Protocol + Rocksky graphs |
| Create | `src/components/ArtistSearch.tsx` | Debounced typeahead that queries Rocksky |
| Modify | `src/routes/Artist.tsx` | Add discography fetch + render grid |
| Modify | `src/routes/Discover.tsx` | Render three-column feed from discover.ts |
| Modify | `src/components/Layout.tsx` | Replace decorative search pill with `<ArtistSearch>` |
| Create | `src/lib/rocksky.test.ts` | Unit tests for pure helpers |
| Create | `src/lib/discover.test.ts` | Unit tests for groupPicksByKind |
| Modify | `package.json` | Add vitest + @vitest/ui |
| Create | `vitest.config.ts` | Vitest configuration |

---

## Task 1: Test runner setup (Vitest)

**Files:**
- Modify: `starter/package.json`
- Create: `starter/vitest.config.ts`

**Interfaces:**
- Produces: `npm test` command that runs all `*.test.ts` files

- [ ] **Step 1: Install vitest**

```bash
cd starter && npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

Expected: packages added to `node_modules`, no errors.

- [ ] **Step 2: Create vitest config**

Create `starter/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
});
```

- [ ] **Step 3: Add test script to package.json**

In `starter/package.json`, add inside `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify runner works with a smoke test**

Create `starter/src/lib/smoke.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
describe('smoke', () => {
  it('runs', () => expect(1 + 1).toBe(2));
});
```

Run:
```bash
cd starter && npm test
```
Expected output: `1 passed`

- [ ] **Step 5: Delete smoke test and commit**

```bash
rm starter/src/lib/smoke.test.ts
cd starter && git add package.json vitest.config.ts && git commit -m "chore: add vitest test runner"
```

---

## Task 2: Rocksky API client (`src/lib/rocksky.ts`)

**Files:**
- Create: `starter/src/lib/rocksky.ts`
- Create: `starter/src/lib/rocksky.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  searchArtists(q: string, limit?: number): Promise<RockskyArtist[]>
  getArtistAlbums(artistUri: string, limit?: number): Promise<RockskyAlbum[]>
  getRockskyFollows(did: string, limit?: number): Promise<RockskyFollow[]>

  interface RockskyArtist { id: string; name: string; picture: string; uri: string; genres: string[]; playCount: number; uniqueListeners: number }
  interface RockskyAlbum  { id: string; uri: string; title: string; artist: string; artistUri: string; year: number; albumArt: string; releaseDate: string; playCount: number; uniqueListeners: number }
  interface RockskyFollow { id: string; did: string; handle: string; displayName: string; avatar: string }
  ```

- [ ] **Step 1: Write the failing tests**

Create `starter/src/lib/rocksky.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { toArtistRef } from './rocksky';
import type { RockskyArtist, RockskyAlbum } from './rocksky';
import { slug } from './pick';

describe('toArtistRef', () => {
  it('builds an ArtistRef from a RockskyArtist with no mbid', () => {
    const artist: RockskyArtist = {
      id: 'rec_abc',
      name: 'Radiohead',
      picture: 'https://example.com/pic.jpg',
      uri: 'at://did:plc:xxx/app.rocksky.artist/3abc',
      genres: [],
      playCount: 100,
      uniqueListeners: 50,
    };
    const ref = toArtistRef(artist);
    expect(ref.name).toBe('Radiohead');
    expect(ref.mbid).toBeUndefined();
  });
});

describe('toAlbumRef', () => {
  it('builds an AlbumRef from a RockskyAlbum', () => {
    const album: RockskyAlbum = {
      id: 'rec_xyz',
      uri: 'at://did:plc:xxx/app.rocksky.album/3def',
      title: 'OK Computer',
      artist: 'Radiohead',
      artistUri: 'at://did:plc:xxx/app.rocksky.artist/3abc',
      year: 1997,
      albumArt: 'https://example.com/cover.jpg',
      releaseDate: '1997-05-28T00:00:00.000Z',
      playCount: 500,
      uniqueListeners: 200,
    };
    const ref = toAlbumRef(album);
    expect(ref.title).toBe('OK Computer');
    expect(ref.year).toBe('1997');
    expect(ref.coverUrl).toBe('https://example.com/cover.jpg');
    expect(ref.mbid).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd starter && npm test
```
Expected: FAIL — `toArtistRef` not found.

- [ ] **Step 3: Implement `src/lib/rocksky.ts`**

Create `starter/src/lib/rocksky.ts`:
```typescript
import type { ArtistRef, AlbumRef } from './types';

const BASE = 'https://api.rocksky.app/xrpc';

async function xrpc<T>(method: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  ).toString();
  const res = await fetch(`${BASE}/${method}?${qs}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Rocksky ${method} ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Response types (verified against live API 2026-06-24) ────────────────────

export interface RockskyArtist {
  id: string;
  name: string;
  picture: string;
  uri: string;
  genres: string[];
  playCount: number;
  uniqueListeners: number;
}

export interface RockskyAlbum {
  id: string;
  uri: string;
  title: string;
  artist: string;
  artistUri: string;
  year: number;
  albumArt: string;
  releaseDate: string;
  playCount: number;
  uniqueListeners: number;
}

export interface RockskyFollow {
  id: string;
  did: string;
  handle: string;
  displayName: string;
  avatar: string;
}

// ── Converters ────────────────────────────────────────────────────────────────

/** Convert a Rocksky artist to an ArtistRef for embedding in a pick record. */
export function toArtistRef(artist: RockskyArtist): ArtistRef {
  return { name: artist.name };
  // mbid: Rocksky does not currently expose MBIDs — add when available.
}

/** Convert a Rocksky album to an AlbumRef for embedding in a pick record. */
export function toAlbumRef(album: RockskyAlbum): AlbumRef {
  return {
    title: album.title,
    year: String(album.year),
    coverUrl: album.albumArt || undefined,
  };
  // mbid: Rocksky does not currently expose MBIDs — add when available.
}

// ── API calls ─────────────────────────────────────────────────────────────────

/** Search Rocksky for artists by name. */
export async function searchArtists(q: string, limit = 10): Promise<RockskyArtist[]> {
  if (!q.trim()) return [];
  const data = await xrpc<{ artists: RockskyArtist[] }>(
    'app.rocksky.artist.getArtists',
    { q: q.trim(), limit },
  );
  return data.artists ?? [];
}

/** Fetch all albums for a Rocksky artist (by their AT URI). */
export async function getArtistAlbums(artistUri: string, limit = 50): Promise<RockskyAlbum[]> {
  const data = await xrpc<{ albums: RockskyAlbum[] }>(
    'app.rocksky.artist.getArtistAlbums',
    { uri: artistUri, limit },
  );
  return data.albums ?? [];
}

/** Fetch accounts the given DID follows on Rocksky. */
export async function getRockskyFollows(did: string, limit = 100): Promise<RockskyFollow[]> {
  const data = await xrpc<{ follows: RockskyFollow[] }>(
    'app.rocksky.graph.getFollows',
    { actor: did, limit },
  );
  return data.follows ?? [];
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd starter && npm test
```
Expected: `2 passed`

- [ ] **Step 5: TypeScript check**

```bash
cd starter && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd starter && git add src/lib/rocksky.ts src/lib/rocksky.test.ts && git commit -m "feat: add Rocksky XRPC client with typed response shapes"
```

---

## Task 3: Discover data layer (`src/lib/discover.ts`)

**Files:**
- Create: `starter/src/lib/discover.ts`
- Create: `starter/src/lib/discover.test.ts`

**Interfaces:**
- Consumes: `listMyPicks(agent, did)` from `./pick`, `getRockskyFollows(did)` from `./rocksky`, `Session` from `./session`
- Produces:
  ```typescript
  interface AuthoredPick { pick: PickRecord; authorDid: string; authorHandle: string; authorAvatar?: string }
  groupPicksByKind(picks: AuthoredPick[]): { best: AuthoredPick[]; favorite: AuthoredPick[]; first: AuthoredPick[] }
  fetchFollowsPicks(agent: Agent, did: string): Promise<AuthoredPick[]>
  ```

- [ ] **Step 1: Write failing tests for `groupPicksByKind`**

Create `starter/src/lib/discover.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { groupPicksByKind } from './discover';
import type { AuthoredPick } from './discover';
import type { PickRecord } from './types';

function makePick(kind: 'best' | 'favorite' | 'first', did: string): AuthoredPick {
  const record: PickRecord = {
    uri: `at://${did}/app.bff.pick/${kind}`,
    value: {
      kind,
      artist: { name: 'Test Artist' },
      album: { title: 'Test Album' },
      createdAt: new Date().toISOString(),
    },
  };
  return { pick: record, authorDid: did, authorHandle: `user.bsky.social` };
}

describe('groupPicksByKind', () => {
  it('partitions picks into three buckets', () => {
    const picks: AuthoredPick[] = [
      makePick('best', 'did:plc:aaa'),
      makePick('favorite', 'did:plc:bbb'),
      makePick('first', 'did:plc:ccc'),
      makePick('best', 'did:plc:ddd'),
    ];
    const grouped = groupPicksByKind(picks);
    expect(grouped.best).toHaveLength(2);
    expect(grouped.favorite).toHaveLength(1);
    expect(grouped.first).toHaveLength(1);
  });

  it('returns empty arrays when no picks', () => {
    const grouped = groupPicksByKind([]);
    expect(grouped.best).toHaveLength(0);
    expect(grouped.favorite).toHaveLength(0);
    expect(grouped.first).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd starter && npm test
```
Expected: FAIL — `groupPicksByKind` not found.

- [ ] **Step 3: Implement `src/lib/discover.ts`**

Create `starter/src/lib/discover.ts`:
```typescript
import type { Agent } from '@atproto/api';
import { listMyPicks } from './pick';
import { getRockskyFollows } from './rocksky';
import type { PickRecord } from './types';

export interface AuthoredPick {
  pick: PickRecord;
  authorDid: string;
  authorHandle: string;
  authorAvatar?: string;
}

export interface GroupedPicks {
  best: AuthoredPick[];
  favorite: AuthoredPick[];
  first: AuthoredPick[];
}

/** Partition a flat list of authored picks into the three BFF columns. */
export function groupPicksByKind(picks: AuthoredPick[]): GroupedPicks {
  return {
    best:     picks.filter(p => p.pick.value.kind === 'best'),
    favorite: picks.filter(p => p.pick.value.kind === 'favorite'),
    first:    picks.filter(p => p.pick.value.kind === 'first'),
  };
}

// ── AT Protocol follows ───────────────────────────────────────────────────────

interface BskyFollow {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

async function getAtProtoFollows(agent: Agent, did: string): Promise<BskyFollow[]> {
  const follows: BskyFollow[] = [];
  let cursor: string | undefined;
  do {
    const res = await agent.app.bsky.graph.getFollows({ actor: did, limit: 100, cursor });
    for (const f of res.data.follows) {
      follows.push({ did: f.did, handle: f.handle, displayName: f.displayName, avatar: f.avatar });
    }
    cursor = res.data.cursor;
  } while (cursor);
  return follows;
}

// ── Combined feed ─────────────────────────────────────────────────────────────

/**
 * Fetch picks from everyone the signed-in user follows (AT Protocol + Rocksky),
 * deduped by DID, sorted newest-first. Returns a flat list with author metadata.
 *
 * TODO(AppView): this follows-merge approach fetches O(follows) listRecords calls.
 * Replace with app.bff.getDiscoverFeed once an AppView is available.
 */
export async function fetchFollowsPicks(agent: Agent, did: string): Promise<AuthoredPick[]> {
  // Collect follows from both graphs in parallel, dedupe by DID.
  const [atFollows, rsFollows] = await Promise.all([
    getAtProtoFollows(agent, did).catch(() => [] as BskyFollow[]),
    getRockskyFollows(did).catch(() => []),
  ]);

  const followMap = new Map<string, { handle: string; displayName?: string; avatar?: string }>();
  for (const f of atFollows) followMap.set(f.did, { handle: f.handle, displayName: f.displayName, avatar: f.avatar });
  for (const f of rsFollows) {
    if (!followMap.has(f.did)) {
      followMap.set(f.did, { handle: f.handle, displayName: f.displayName, avatar: f.avatar });
    }
  }

  // Fetch picks for all follows in parallel (cap at 20 concurrent to avoid hammering the PDS).
  const dids = [...followMap.keys()];
  const BATCH = 20;
  const authored: AuthoredPick[] = [];
  for (let i = 0; i < dids.length; i += BATCH) {
    const batch = dids.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(followDid => listMyPicks(agent, followDid)),
    );
    for (let j = 0; j < batch.length; j++) {
      const r = results[j];
      if (r.status !== 'fulfilled') continue;
      const meta = followMap.get(batch[j])!;
      for (const pick of r.value) {
        authored.push({ pick, authorDid: batch[j], authorHandle: meta.handle, authorAvatar: meta.avatar });
      }
    }
  }

  // Sort newest-first.
  authored.sort((a, b) =>
    new Date(b.pick.value.createdAt).getTime() - new Date(a.pick.value.createdAt).getTime(),
  );

  return authored;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd starter && npm test
```
Expected: `4 passed` (2 from rocksky.test.ts, 2 from discover.test.ts)

- [ ] **Step 5: TypeScript check**

```bash
cd starter && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd starter && git add src/lib/discover.ts src/lib/discover.test.ts && git commit -m "feat: add discover data layer with AT Protocol + Rocksky follows merge"
```

---

## Task 4: ArtistSearch component (`src/components/ArtistSearch.tsx`)

**Files:**
- Create: `starter/src/components/ArtistSearch.tsx`

**Interfaces:**
- Consumes: `searchArtists(q)` from `../lib/rocksky`, `useNavigate` from `react-router-dom`, `artistKey` from `../lib/pick`
- Produces: `<ArtistSearch />` — a self-contained typeahead that navigates to `/artist/{key}` on selection, passing Rocksky metadata as router state.

- [ ] **Step 1: Create the component**

Create `starter/src/components/ArtistSearch.tsx`:
```typescript
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
```

- [ ] **Step 2: Wire into Layout — replace the decorative pill**

In `starter/src/components/Layout.tsx`, add the import at the top:
```typescript
import ArtistSearch from './ArtistSearch';
```

Replace the decorative search div:
```typescript
// DELETE this block:
<div style={{
  display: 'flex', alignItems: 'center', gap: 9,
  background: 'var(--surface)', border: '1px solid var(--hairline-2)',
  borderRadius: 'var(--r-input)', padding: '9px 13px',
  minWidth: 248, color: 'var(--faint)', fontSize: 14,
}}>
  <span>⌖</span>
  <span>search artists, albums, people</span>
</div>

// ADD this:
<ArtistSearch />
```

- [ ] **Step 3: TypeScript check**

```bash
cd starter && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Smoke test in browser**

Navigate to `http://127.0.0.1:5173`, sign in. Type "radiohead" in the top nav search box. Expected: artist results dropdown appears within ~400ms. Click a result — expected: navigates to `/artist/name:radiohead`.

- [ ] **Step 5: Commit**

```bash
cd starter && git add src/components/ArtistSearch.tsx src/components/Layout.tsx && git commit -m "feat: live artist search typeahead in top nav via Rocksky"
```

---

## Task 5: Artist route — discography grid

**Files:**
- Modify: `starter/src/routes/Artist.tsx`

**Interfaces:**
- Consumes:
  - Router state: `{ rockskyUri: string; picture: string; name: string }` (set by `<ArtistSearch>`)
  - `getArtistAlbums(artistUri)` from `../lib/rocksky`
  - `useQuery` from `@tanstack/react-query`
  - `useSession` from `../lib/session`
  - `putPick` from `../lib/pick`
  - `toArtistRef`, `toAlbumRef` from `../lib/rocksky`
- Produces: Artist page with artist header + discography grid; each album card has Best / Favorite / First buttons.

- [ ] **Step 1: Replace Artist.tsx with the wired implementation**

Replace the full contents of `starter/src/routes/Artist.tsx`:
```typescript
import { useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { useSession } from '../lib/session';
import { putPick, artistKey as makeArtistKey } from '../lib/pick';
import { getArtistAlbums, toArtistRef, toAlbumRef, type RockskyAlbum } from '../lib/rocksky';
import type { PickKind } from '../types';

export default function Artist() {
  const { artistKey } = useParams<{ artistKey: string }>();
  const { state } = useLocation() as { state?: { rockskyUri?: string; picture?: string; name?: string } };
  const { session } = useSession();

  const rockskyUri = state?.rockskyUri ?? null;
  const artistName = state?.name ?? artistKey?.replace(/^name:/, '').replace(/-/g, ' ') ?? '—';

  const albumsQuery = useQuery({
    queryKey: ['artist-albums', rockskyUri],
    queryFn: () => getArtistAlbums(rockskyUri!, 60),
    enabled: !!rockskyUri,
    staleTime: 5 * 60_000,
  });

  async function handlePick(album: RockskyAlbum, kind: PickKind) {
    if (!session) return;
    const artist = toArtistRef({ id: '', name: artistName, picture: state?.picture ?? '', uri: rockskyUri ?? '', genres: [], playCount: 0, uniqueListeners: 0 });
    await putPick(session.agent, { kind, artist, album: toAlbumRef(album) });
  }

  return (
    <Layout>
      {/* ── Artist header ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 36 }}>
        {state?.picture && (
          <img src={state.picture} alt="" style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
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
```

Note: the import `type { PickKind }` should come from `../lib/types`, not `../types`. Fix if TypeScript complains:
```typescript
import type { PickKind } from '../lib/types';
```

- [ ] **Step 2: TypeScript check**

```bash
cd starter && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Browser test**

Navigate to `http://127.0.0.1:5173`, sign in, search "gorillaz" in the top nav, click the result. Expected:
- Artist header shows Gorillaz name + picture
- Discography grid loads with album covers, titles, years
- Clicking ★ on an album calls `putPick` (check browser console for network request to PDS)

- [ ] **Step 4: Commit**

```bash
cd starter && git add src/routes/Artist.tsx && git commit -m "feat: Artist route — discography grid from Rocksky with pick buttons"
```

---

## Task 6: Discover route — three-column feed

**Files:**
- Modify: `starter/src/routes/Discover.tsx`

**Interfaces:**
- Consumes: `fetchFollowsPicks`, `groupPicksByKind`, `AuthoredPick` from `../lib/discover`, `useSession` from `../lib/session`, `useQuery` from `@tanstack/react-query`
- Produces: `/` page with three columns (Best / Favorite / First) of pick cards from follows, or an empty-state prompt.

- [ ] **Step 1: Replace Discover.tsx with the wired implementation**

Replace the full contents of `starter/src/routes/Discover.tsx`:
```typescript
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { useSession } from '../lib/session';
import { fetchFollowsPicks, groupPicksByKind, type AuthoredPick } from '../lib/discover';

const KIND_META = {
  best:     { label: 'Best',     glyph: '★', color: 'var(--best)',  tint: 'var(--best-tint)',  ink: 'var(--best-ink)',  caption: 'the peak' },
  favorite: { label: 'Favorite', glyph: '♥', color: 'var(--fav)',   tint: 'var(--fav-tint)',   ink: 'var(--fav-ink)',   caption: 'yours' },
  first:    { label: 'First',    glyph: '①', color: 'var(--first)', tint: 'var(--first-tint)', ink: 'var(--first-ink)', caption: 'start here' },
} as const;

export default function Discover() {
  const { session } = useSession();

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

      {picksQuery.isLoading && (
        <div style={{ color: 'var(--faint)', fontSize: 14 }}>Loading picks from people you follow…</div>
      )}

      {picksQuery.isError && (
        <div style={{ color: 'var(--fav)', fontSize: 14 }}>
          Couldn't load feed: {(picksQuery.error as Error).message}
        </div>
      )}

      {grouped && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {(['best', 'favorite', 'first'] as const).map(kind => {
            const meta = KIND_META[kind];
            const picks = grouped[kind];
            return (
              <div key={kind}>
                {/* Column header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 6, background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--on-brand)', fontSize: 12, flexShrink: 0 }}>{meta.glyph}</span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, lineHeight: 1 }}>{meta.label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--faint)', letterSpacing: '1px' }}>{meta.caption.toUpperCase()}</div>
                  </div>
                </div>

                {/* Cards */}
                {picks.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--faint)', padding: '12px 0' }}>
                    No {meta.label.toLowerCase()} picks yet from people you follow.
                  </div>
                )}
                {picks.map((ap, i) => <PickCard key={i} ap={ap} kind={kind} />)}
              </div>
            );
          })}
        </div>
      )}

      {grouped && picksQuery.data?.length === 0 && (
        <div style={{ marginTop: 16, fontSize: 14, color: 'var(--faint)' }}>
          Follow people on Bluesky or Rocksky to see their picks here.
          {/* TODO(AppView): replace follows-merge with app.bff.getDiscoverFeed once AppView is live */}
        </div>
      )}
    </Layout>
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
        {/* Cover */}
        {album.coverUrl
          ? <img src={album.coverUrl} alt="" style={{ width: 52, height: 52, borderRadius: 6, objectFit: 'cover', flexShrink: 0, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.07)' }} />
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
```

- [ ] **Step 2: TypeScript check**

```bash
cd starter && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
cd starter && npm test
```
Expected: all tests pass.

- [ ] **Step 4: Browser test**

Navigate to `http://127.0.0.1:5173` signed in. Expected:
- "Loading picks from people you follow…" appears briefly
- Three-column layout renders (Best / Favorite / First)
- If you follow people who have made BFF picks, their cards appear
- If no one you follow has picks: "No best picks yet from people you follow." message shows in each column
- If you follow no one: the "Follow people…" message shows below columns

- [ ] **Step 5: Commit**

```bash
cd starter && git add src/routes/Discover.tsx && git commit -m "feat: Discover three-column feed from AT Protocol + Rocksky follows"
```

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| Rocksky typed client, browser-callable | Task 2 |
| Artist live search typeahead | Task 3 (ArtistSearch) + Task 4 (wire to Layout) |
| Discography from Rocksky given artist | Task 5 |
| Pick buttons on album cards | Task 5 (AlbumCard) |
| Discover: AT Protocol follows + their picks | Task 3 (discover.ts getAtProtoFollows) |
| Discover: Rocksky follows union | Task 3 (discover.ts getRockskyFollows) |
| Discover: three-column render | Task 6 |
| Cover art from Rocksky albumArt field | Task 5 + Task 6 (PickCard) |
| `toArtistRef` / `toAlbumRef` converters | Task 2 |
| `groupPicksByKind` unit-tested | Task 3 |
| `toArtistRef` / `toAlbumRef` unit-tested | Task 2 |
| Test runner (vitest) | Task 1 |
| No backend invented | Maintained — all calls are client-side fetch |
| `app.bff.pick` lexicon unchanged | Maintained |

**Placeholder scan:** None found — all code blocks are complete and runnable.

**Type consistency check:**
- `RockskyArtist.uri` → passed to `getArtistAlbums(artistUri)` as `string` ✓
- `toArtistRef(artist: RockskyArtist): ArtistRef` → `ArtistRef` matches `types.ts` ✓
- `toAlbumRef(album: RockskyAlbum): AlbumRef` → `AlbumRef` matches `types.ts` ✓
- `AuthoredPick.pick: PickRecord` → `PickRecord` from `types.ts` ✓
- `groupPicksByKind` test uses `PickRecord` from `types.ts` ✓
- `putPick(agent, { kind, artist, album })` matches `pick.ts` signature ✓
- `PickKind` imported from `lib/types` in Artist.tsx ✓
