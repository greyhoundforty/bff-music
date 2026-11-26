# Architecture analysis — Best · Favorite · First

Evaluated against `README.md`, `ARCHITECTURE.md`, `CLAUDE.md`, `lexicons/README.md`, and the live tree under `starter/src` plus the deploy host (`server.py`, `Dockerfile`). No application code was changed.

The handoff describes a Vite SPA whose non-obvious work — OAuth, session, and `app.bff.pick` records — lives in `lib/`, with routes as thin screens. That split is still the right one. The implementation has already moved into the next milestone (discography, profile grouping, a follows fan-out, a Rocksky chart) while the module boundaries stayed at the skeleton’s grain. Protocol code is clean. Page code is doing domain work the library was supposed to own.

## What the docs lock in

| Concern | Locked choice |
|---|---|
| Host | Vite SPA. Data is per-user and fetched in the browser. |
| Auth | `@atproto/oauth-client-browser`. `init()` once on load. Scope `atproto transition:generic`. |
| Records | One `app.bff.pick` per `(artist, kind)`, rkey `` `${artistKey}.${kind}` ``, `putRecord` / `deleteRecord`. |
| Catalog | Artists and albums are embedded refs (name + optional MusicBrainz id), never atproto records. |
| Reads | TanStack Query over `listRecords`. A global Discover feed is an AppView later. |
| UI boundary | Components call `useSession()` and `pick.ts`. They do not talk to the PDS themselves. |
| Schema | `lexicons/app/bff/pick.json` is the source of truth. `types.ts` stays in sync by hand or via `@atproto/lex-cli`. |

`CLAUDE.md` also freezes a session contract: `useSession()` returns `{ agent, did, handle }` when signed in and `null` otherwise. The code returns a context object on every render. That is a better hook, and it is a different contract than the one the handoff tests against.

## How the code is actually layered

```
main.tsx
  BrowserRouter
    QueryClientProvider          staleTime 30s, gcTime 5m
      SessionProvider            OAuth init, Agent, did, handle
        App                      RequireAuth / RedirectIfAuthed
          routes                 queries + grouping + inline styles
            Layout / ArtistSearch
              lib/oauth.ts       singleton BrowserOAuthClient
              lib/session.tsx    React context
              lib/pick.ts        rkey + repo CRUD
              lib/types.ts       hand-written lexicon mirror
              lib/musicbrainz.ts catalog search + release groups
              lib/rocksky.ts     follows + trending albums
              lib/discover.ts    fan-out merge of follows' picks
server.py + Dockerfile           static SPA + index.html fallback
```

Five abstraction levels are visible. They are not equally finished.

1. **Session.** `oauth.ts` and `session.tsx` are a real boundary. Routes never construct an `Agent`. `getOAuthClient()` caches the load promise so concurrent callers share one client. `SessionProvider` uses a ref so React StrictMode cannot exchange a single-use OAuth code twice. `toSession` resolves a handle through `getProfile` and falls back to the DID. Route guards in `App.tsx` are small wrapper components. This is the strongest layer in the app.

2. **Record domain.** `pick.ts` owns slug, `artistKey`, `pickRkey`, and the three repo operations. Callers pass an `Agent` in, so the module stays free of React. Writes are `putRecord` at a deterministic rkey. Reads paginate `listRecords` at 100. That matches the data model in `ARCHITECTURE.md`.

3. **External catalogs.** `musicbrainz.ts` and `rocksky.ts` are typed `fetch` wrappers with adapter functions (`toArtistRef`, `toAlbumRef`). Components do not call those hosts directly, except that the adapters’ *results* leak into route state (see below).

4. **Application services.** Only Discover has one: `fetchFollowsPicks` plus `groupPicksByKind`. Profile’s trio grouping and Artist’s “which slot is this album” logic live inside the route files. The service layer is one screen deep.

5. **Presentation.** Every screen is one file of inline style objects, local subcomponents, and `useQuery`. `tokens.css` defines the palette; the components re-state layout, type size, and a few raw hex values on every element. There is no shared `KindMark`, card, or empty state.

## Patterns in use

| Pattern | Where | What it is doing |
|---|---|---|
| Provider + hook | `session.tsx` | Auth state and the two commands (`signIn`, `signOut`) |
| Lazy singleton | `oauth.ts` | One `BrowserOAuthClient.load()` for the page lifetime |
| Repository functions | `pick.ts` | Collection name, rkey, and XRPC hidden behind three functions |
| Adapter | `musicbrainz.ts` | MusicBrainz JSON → `ArtistRef` / `AlbumRef` |
| Query-at-the-route | `Artist`, `Profile`, `Discover` | Each screen declares its own `useQuery` |
| Fan-out aggregator | `discover.ts` | N `listRecords` calls, batched 20, then sort by `createdAt` |
| Guard components | `App.tsx` | `RequireAuth`, `RedirectIfAuthed` |
| Router state as a cache | `ArtistSearch` → `Artist` | The MusicBrainz artist object rides on `location.state` |

Missing patterns that the current features already need: a query-hook module (so `['my-picks', did]` is declared once), a parse function next to `pickRkey`, a `DiscoverSource` interface in front of the fan-out, and a small presentational kit for the three kinds.

## Where the implementation diverges from the handoff

**Session shape.** Call sites use `const { session } = useSession()` and then `session.agent`. Loading, `initError`, `signIn`, and `signOut` are on the same object. The handoff’s “null when signed out” check is now `session === null` inside a context that is never null. Guards depend on a separate `loading` flag, which is the right call — a bare null cannot tell “still restoring IndexedDB” from “signed out”. The written definition of done has not been updated to match.

**Callback routing.** `ARCHITECTURE.md` specifies a hash route (`#/callback`) so a static host can serve `index.html` with no rewrite, and `redirect_uris` can point at the origin. The app uses `BrowserRouter` and `/callback`. `main.tsx` rewrites `localhost` to `127.0.0.1` because the loopback client rejects `localhost` in `redirect_uri` (RFC 8252), and `oauth.ts` builds an explicit loopback `client_id` instead of passing `clientId: undefined`. `server.py` exists to catch 404s and return `index.html`. The Python process is a static file server, not an AppView, but it is the direct consequence of leaving the hash-route design. Production metadata in `starter/public/client-metadata.json` is already pinned to a Code Engine origin and lists `/callback`.

**Discover is a client fan-out over Rocksky follows.** `ARCHITECTURE.md` says the first Discover reads picks from accounts the viewer follows on AT Protocol, and that this will not scale. `fetchFollowsPicks` calls `getRockskyFollows(did)` and, on any failure, substitutes `[]`. It never reads `app.bsky.graph.getFollows`. A viewer whose Bluesky graph and Rocksky graph differ sees a different feed than the architecture describes, and a Rocksky outage looks like an empty community. Each follow then runs a full paginated `listRecords`. Per-repo failures are dropped by `Promise.allSettled`. The AppView TODO is present in a comment. The seam that would let an AppView replace this function is not: Discover imports `fetchFollowsPicks` by name.

**Catalog identity is split, and only one side is in the URL.** Search and discography use MusicBrainz. Trending and the follow graph use Rocksky. Picks store an MBID when search produced one. `ArtistSearch` navigates to `/artist/${artistKey}` and passes the `MBArtist` through router state. `Artist.tsx` reads the MBID from that state:

```20:21:starter/src/routes/Artist.tsx
  const mbid = state?.artist?.id ?? null;
  const artistName = state?.artist?.name ?? artistKey?.replace(/^name:/, '').replace(/-/g, ' ') ?? '—';
```

Refresh, a shared link, or the nav item `/artist/explore` arrives with a path and no state. Discography is disabled (`enabled: !!mbid`). The header falls back to a slug-to-words guess that does not understand an `mbid:` key. The URL already contains the key the record model was designed around; the page does not parse it.

**The “set your three” interaction is in two places.** The slot row the design spec calls for is still the dashed placeholder. The live write path is three glyph buttons on each album card. Both call the same `putPick` / `deletePick`, but the slot row — the thing that should show the current trio independent of the discography filter — does not exist. Profile is the only screen that groups a user’s picks into trios, and it does that grouping locally.

**Schema is copied, not generated.** `lexicons/app/bff/pick.json` and `starter/lexicons/app/bff/pick.json` are two files. `types.ts` is a third, hand-written, with a comment pointing at `lex-cli`. `listMyPicks` then asserts `r.value as AppBffPick`. A record that fails the lexicon (missing `album`, unknown `kind`) still enters the UI.

**Styling system stopped at tokens.** `tokens.css` is a faithful extraction of the spec (paper, amber/coral/green, three font variables, radii, shadows, `--content-max`). Components honor the variables and then repeat layout in `style={{}}`. `KIND_META` is declared in both `Discover.tsx` and `Profile.tsx`. The wordmark is copied in `Login`, `Callback`, and `Layout`. `Callback` hardcodes `#C2902F`, `#CC6B52`, `#2E9E78`. Avatars hardcode `#E7D7B8`. The login input hardcodes `#fff`. `Layout` still notes that the active nav underline is TODO.

**Tests cover adapters, not the rules that can corrupt data.** `musicbrainz.test.ts` checks `toArtistRef` / `toAlbumRef`. `discover.test.ts` checks `groupPicksByKind`. There are no tests for `slug`, `artistKey`, `pickRkey`, pagination in `listMyPicks`, or the rkey parsing duplicated in the routes. The pure functions most likely to drift from the lexicon are the untested ones.

## Structural details that will hurt the next screen

**Rkey parsing is reimplemented in the view.** Profile slices the URI with `lastIndexOf('.')`. Artist checks `rkey.startsWith(prefix)`. `pick.ts` knows how to build the key and does not know how to read it back. Today the slug charset strips `.`, so the last dot is the kind separator. That invariant is implicit. A future kind name, or a switch to the `artistPicks` record shape documented in `lexicons/README.md`, has to be edited in two route files plus the writer.

**`putPick` always stamps a new `createdAt` unless the caller passes one.** Artist’s toggle does not pass one. Re-picking a slot is a new event in the Discover sort. The architecture treats overwrite as “the same slot, replaced.” The feed treats it as “a new tag.” Those can both be right, but the choice currently lives in a default argument, not in a named policy.

**Query keys are a convention, not a module.** `['my-picks', did]` is shared by Artist and Profile, and Artist invalidates it after a write. That works only because both files spell the key the same way. Discover uses `['discover-feed', did]` and is not invalidated when the viewer writes a pick. Trending uses `['rocksky-trending']` with its own 5-minute `staleTime`, while the plan doc asked for 60 seconds on Rocksky reads. Defaults in `main.tsx` say 30 seconds; call sites override them independently.

**The OAuth singleton remembers failure.** If `BrowserOAuthClient.load()` rejects, `_clientPromise` stays rejected and every later `signIn` awaits the same failure. A transient metadata or network error during first load requires a full reload.

**Session context identity changes every render.** The provider value is a fresh object, and `signOut` closes over `session`, so its identity changes when auth changes. Every `useSession()` consumer re-renders together. Fine at this size. It becomes noisy once album grids subscribe to the same context as the top bar.

**`listMyPicks` is both “my repo” and “any repo.”** The second argument turns the profile helper into the Discover fan-out. The name and the TODO above it still describe grouping the signed-in user’s picks. Callers that pass another DID are doing a public read through the viewer’s agent, which is correct for a PDS, and it is undocumented in the type.

**Trending cards are a dead end.** `TrendingCard` renders a Rocksky album (string artist, Rocksky id, `albumArt`) with no link into `/artist/:artistKey` and no mapping onto `AlbumRef`. The chart and the pick model do not share a type, so the most visible row on Discover cannot become a pick without a new adapter.

**Login still advertises unfinished flows.** “Use a custom server (PDS)” and “Browse without signing in” are visible controls with TODO comments. `handleResolver` is fixed to `https://bsky.social` in `oauth.ts`. A custom-PDS control that does not change the resolver will send the user through Bluesky’s handle resolution anyway.

## Pros and cons of the current implementation

| | Pros | Cons |
|---|---|---|
| **Session layer** | OAuth, StrictMode, and route guards are isolated. `init()` runs once and both completes the callback and restores IndexedDB. Scope includes `transition:generic`. | Public `useSession()` shape no longer matches `CLAUDE.md`. A failed `load()` is cached forever. Context value is not memoized. |
| **Record model** | Deterministic rkey and `putRecord` match the lexicon. `Agent` is an argument, so `pick.ts` is testable without React. Pagination is real. | No `parseRkey`. No runtime check against the lexicon. `createdAt` policy on overwrite is accidental. `listMyPicks(agent, otherDid)` overloads a “mine” API. |
| **Catalog split** | MusicBrainz for canonical ids, Rocksky for a music-native social graph, AT Protocol for auth and storage. Adapters keep MB JSON out of `AppBffPick`. | Three identity systems (DID, MBID, Rocksky URI) meet only inside route components. Router state, not the MBID in the path, unlocks the artist page. Trending albums cannot navigate or be picked. |
| **Discover** | Fan-out is outside the component. Failures of individual repos do not fail the page. The AppView is named in a TODO instead of a fake API. | Follows come from Rocksky only, and a Rocksky error becomes an empty feed. Cost is O(follows × pages) on every 60s stale window. No interface to swap in `app.bff.getDiscoverFeed`. |
| **Routing** | Five routes, auth guards, and a dedicated callback error surface. `/you` and `/` are stable. | `/callback` requires the SPA fallback the hash-route design was meant to avoid. `/artist/explore` is a nav target with no artist. Deep links to artists drop the discography. |
| **UI structure** | Tokens exist and most colors go through them. Login is close to the spec. Profile already has the two groupings the architecture asked for (by artist, by kind). | Routes are 180–240 line style-and-data files. Kind chrome, wordmark, and cards are copied. A few hex values bypass the tokens. The slot row and the album buttons are two interaction models for one write. |
| **Schema** | Lexicon is small, readable, and matches `types.ts` field-for-field today. | Two JSON copies plus a hand-written TS file. Casts at the `listRecords` boundary. `lex-cli` is documented and unused. |
| **Deploy** | Multi-stage image builds the SPA and serves it. Client metadata is a real HTTPS URL, which production OAuth requires. | `client_id` is baked to one Code Engine hostname. The server is another runtime to patch for what is still a static site. |
| **Tests** | Vitest is wired. Adapter and grouping tests lock the two pure conversions that already moved once (the plan’s Rocksky artist type became MusicBrainz). | rkey, slug, pagination, and route-level grouping are untested. No component tests, despite Testing Library being installed. |

## A tighter architecture

Keep the SPA, the lexicon, the rkey rule, and the “no AppView yet” decision. Move three kinds of logic that have already leaked: parsing keys, declaring queries, and choosing a feed source.

### 1. Make the artist key a parsed value, and let the URL hold it

```ts
// lib/pick.ts
export type ParsedArtistKey =
  | { type: 'mbid'; mbid: string }
  | { type: 'name'; slug: string };

export function parseArtistKey(key: string): ParsedArtistKey | null {
  if (key.startsWith('mbid:')) return { type: 'mbid', mbid: key.slice(5) };
  if (key.startsWith('name:')) return { type: 'name', slug: key.slice(5) };
  return null;
}

export function rkeyOf(uri: string): string {
  return uri.split('/').pop() ?? '';
}

export function pickKindFromRkey(rkey: string): PickKind | null { /* last segment */ }
export function artistKeyFromRkey(rkey: string): string { /* everything before the last dot */ }
```

`Artist` then enables discography from the param:

```tsx
const parsed = parseArtistKey(params.artistKey ?? '');
const mbid = parsed?.type === 'mbid' ? parsed.mbid : null;

useQuery({
  queryKey: ['artist-albums', mbid],
  queryFn: () => getArtistReleaseGroups(mbid!, 100),
  enabled: parsed?.type === 'mbid',
});
```

Router `state` can still carry the display name for the first paint after search. It stops being the source of the MBID. `/artist/explore` should be a different route, or the nav should not link there until an explore page exists.

### 2. One query module so screens share cache keys

```ts
// lib/queries.ts
export const picksKey = (did: string) => ['my-picks', did] as const;

export function useMyPicks() {
  const { session } = useSession();
  return useQuery({
    queryKey: picksKey(session?.did ?? ''),
    queryFn: () => listMyPicks(session!.agent),
    enabled: !!session,
  });
}

export function useDiscoverFeed() {
  const { session } = useSession();
  return useQuery({
    queryKey: ['discover-feed', session?.did],
    queryFn: () => discoverSource.fetchFeed(session!),
    enabled: !!session,
    staleTime: 60_000,
  });
}
```

Writes go through one helper that knows every key a pick can dirty:

```ts
export async function commitPick(qc: QueryClient, session: AuthedSession, input: PutPickInput) {
  await putPick(session.agent, input);
  await qc.invalidateQueries({ queryKey: picksKey(session.did) });
  await qc.invalidateQueries({ queryKey: ['discover-feed', session.did] });
}
```

Grouping moves next to the reader, because both Profile and Artist already do it:

```ts
export interface ArtistTrio {
  artistKey: string;
  name: string;
  best?: PickRecord;
  favorite?: PickRecord;
  first?: PickRecord;
}

export function groupByArtist(picks: PickRecord[]): ArtistTrio[] { /* uses artistKeyFromRkey */ }
```

### 3. A feed source with one implementation today

```ts
export interface DiscoverSource {
  fetchFeed(viewer: { agent: Agent; did: string }): Promise<AuthoredPick[]>;
}

export const followsFanOut: DiscoverSource = {
  async fetchFeed({ agent, did }) {
    // Rocksky graph and, when wanted, app.bsky.graph.getFollows.
    // Empty-on-error stays a decision at this boundary, visible to the UI
    // as a result flag rather than a swallowed [].
  },
};

// Later, same interface:
// export const appViewFeed: DiscoverSource = { fetchFeed: () => agent.app.bff.getDiscoverFeed(...) }
```

`Discover.tsx` should not know whether the rows came from N PDS reads or one AppView call. Surfacing “follows could not be loaded” separately from “follows have no picks” is what makes the current `.catch(() => [])` safe to keep.

### 4. Presentation below the route, still using the tokens

Routes compose. They stop owning kind chrome.

```tsx
// components/kind.tsx — single map used by Discover, Profile, Artist, wordmark
export const KINDS = {
  best:     { label: 'Best',     glyph: '★', glyphVar: 'var(--best)',  tint: 'var(--best-tint)' },
  favorite: { label: 'Favorite', glyph: '♥', glyphVar: 'var(--fav)',   tint: 'var(--fav-tint)' },
  first:    { label: 'First',    glyph: '①', glyphVar: 'var(--first)', tint: 'var(--first-tint)' },
} as const;

export function KindMark({ kind, size = 22 }: { kind: PickKind; size?: number }) { /* … */ }
export function Wordmark() { /* Login, Callback, Layout */ }
```

Album cards, trio cards, and the slot row take data and callbacks. `Artist` becomes: header, `SlotRow` bound to `groupByArtist`, discography grid bound to `useArtistAlbums`. The dashed placeholder and the per-album buttons stop being two sources of truth; the buttons write, the slot row shows the result of the same `useMyPicks` data.

Inline styles can stay. The win is deleting the third copy of the wordmark and the second `KIND_META`, and routing every brand color through the variables already in `tokens.css` (including the avatar sand, which belongs in the token file if the spec keeps it).

### 5. Generate the record type, and check it at the boundary

```bash
npx @atproto/lex-cli gen-api starter/src/lexicon lexicons/app/bff/pick.json
```

Delete the duplicate under `starter/lexicons/` or make the build copy from `lexicons/`. `listMyPicks` filters with a narrow type guard so a bad record cannot become a card:

```ts
function isPick(value: unknown): value is AppBffPick {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (v.kind === 'best' || v.kind === 'favorite' || v.kind === 'first')
    && typeof (v.artist as { name?: unknown } | undefined)?.name === 'string'
    && typeof (v.album as { title?: unknown } | undefined)?.title === 'string'
    && typeof v.createdAt === 'string';
}
```

### 6. Target shape

```
starter/src/
  main.tsx                      providers only
  App.tsx                       routes + guards
  styles/tokens.css
  lib/
    oauth.ts
    session.tsx                 memoized context value
    types.ts                    generated, or checked in from lex-cli
    pick.ts                     rkey build + parse, put/list/delete, trio grouping
    queries.ts                  useMyPicks, useDiscoverFeed, useArtistAlbums, commitPick
    musicbrainz.ts
    rocksky.ts
    discover.ts                 DiscoverSource; followsFanOut is the current impl
  components/
    Layout.tsx
    ArtistSearch.tsx
    kind.tsx                    KINDS, KindMark, Wordmark
    PickCard.tsx
    TrioCard.tsx
    AlbumCard.tsx
    SlotRow.tsx
  routes/
    Login.tsx
    Callback.tsx
    Discover.tsx                layout only
    Artist.tsx                  layout only
    Profile.tsx                 layout only
```

`server.py` can stay as the production static host. It should not grow XRPC handlers. When Discover needs to scale, the new process is an AppView that speaks `app.bff.getDiscoverFeed`, and the SPA swaps `DiscoverSource`.

## What is already in good shape

The parts the handoff called non-obvious are the parts that aged well.

- OAuth scope, loopback versus hosted `client_id`, and a single `init()` are implemented and commented at the call site.
- Picks are repo records. Nothing tries to create artist or album records.
- `putPick` / `listMyPicks` / `deletePick` have real bodies, not TODO stubs.
- TanStack Query is the read cache, keyed by DID, with a 30-second default that matches “my picks” on Artist and Profile.
- The per-pick record (instead of one `artistPicks` blob) is still the right call for a feed that sorts and attributes each tag, and the rejected alternative is written down in `lexicons/README.md`.
- External services are modules with explicit return types. The drift is that routes reached into those types (`MBArtist` on location state, `RockskyAlbum` only inside Discover) instead of stopping at `ArtistRef` / `AlbumRef`.

The next change that pays off is not a new framework. It is pulling rkey parsing, trio grouping, and the shared pick query into `lib/`, and treating the artist MBID in the URL as the identifier the rkey scheme already is.
