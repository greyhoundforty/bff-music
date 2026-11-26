# Architecture — BFF wire-up

## Stack
| Concern | Choice | Notes |
|---|---|---|
| Build / dev server | **Vite** | SPA, fast HMR; works well with browser OAuth redirects |
| Language | **TypeScript** | strict |
| UI | **React 18** | function components + hooks |
| Routing | **react-router-dom v6** | client-side routes + an OAuth callback route |
| Server state | **@tanstack/react-query** | caching for `listRecords`/`getRecord` once read logic lands |
| atproto OAuth | **@atproto/oauth-client-browser** | handle→PDS resolution, PKCE, token refresh, session storage |
| atproto API | **@atproto/api** | `Agent` for authed XRPC calls (`com.atproto.repo.*`) |
| Styling | CSS variables (`src/styles/tokens.css`) + your choice (CSS Modules / Tailwind) | tokens are in `DESIGN_SPEC.md` |

Rationale for "decide for me": a Vite SPA is the lowest-friction host for `@atproto/oauth-client-browser` (it assumes a browser with a redirect URI). Next.js/SSR adds avoidable complexity for an app whose data is per-user and client-fetched. If mobile is needed later, the lexicon + lib layer port directly to a React Native client.

---

## AT Protocol auth flow (OAuth)

```
[Login screen]
  user types handle:  alice.bsky.social
        │
        ▼
  BrowserOAuthClient.signIn(handle, { scope })
        │  resolves handle → DID → PDS, builds PKCE + state, redirects
        ▼
[ user's PDS / authorization server ]  ← user approves
        │  redirects back to redirect_uri (#/callback) with code+state
        ▼
[Callback route]
  oauthClient.init()  →  returns { session }
        │
        ▼
  new Agent(session)  →  store in SessionProvider context
        │
        ▼
[Authed app]  agent.com.atproto.repo.putRecord(...)  etc.
```

### Key pieces
- **Client metadata** is a JSON document served at a public HTTPS URL; its URL **is** the `client_id`. A starter lives at `starter/public/client-metadata.json`. For **local dev**, `@atproto/oauth-client-browser` supports a loopback client — pass `clientId: undefined` (or the dev helper) and it derives a `http://localhost` client automatically. For **production**, host `client-metadata.json` at your domain and set `client_id` to its URL.
- **Scope:** `atproto transition:generic`. `atproto` is required; `transition:generic` grants generic repo read/write so we can `putRecord`/`listRecords` on `app.bff.*`. Tighten later if a narrower scope lexicon-permission model is available.
- **Redirect URI:** `<origin>/` in dev (loopback) or `<origin>/callback`. Must be listed in client metadata. We use a hash route `#/callback` so a static host needs no SPA-rewrite; `redirect_uris` then point at the origin and `Callback.tsx` reads the params.
- **Session persistence & refresh** are handled by the client (IndexedDB). On app load, call `oauthClient.init()`; if it returns a session, the user is already signed in.

See `starter/src/lib/oauth.ts` and `starter/src/lib/session.tsx` for the concrete wiring, and `starter/src/routes/Login.tsx` / `Callback.tsx` for the UI ends.

---

## Data model — picks as records

Each pick is a record of type **`app.bff.pick`** in the **signed-in user's own repo** (collection `app.bff.pick`). Albums/artists are *not* atproto records, so a pick embeds a lightweight external reference (display name + optional MusicBrainz ID + year + cover URL). Full schema in `lexicons/app/bff/pick.json`; TS types in `starter/src/lib/types.ts`.

```jsonc
// one record
{
  "$type": "app.bff.pick",
  "kind": "best",                         // "best" | "favorite" | "first"
  "artist": { "name": "Radiohead", "mbid": "a74b1b7f-…" },
  "album":  { "title": "OK Computer", "year": "1997", "mbid": "b1392450-…",
              "coverUrl": "https://…" },
  "note": "the one that rewired me.",     // optional
  "createdAt": "2026-06-23T10:04:00.000Z"
}
```

### "One pick per (artist, kind)" — enforced with a deterministic rkey
A user has at most one Best / Favorite / First **per artist**. atproto PDS has no unique constraints, so we encode uniqueness in the **record key**:

```
rkey = `${artistKey}.${kind}`     e.g.  "mbid:a74b1b7f….best"
artistKey = mbid ? `mbid:${mbid}` : `name:${slug(name)}`
```

Writing a pick is therefore a **`putRecord`** (create-or-overwrite) at that rkey — re-tagging the same slot just replaces the record; switching which album is "Best" overwrites in place. Removing a pick is `deleteRecord` at the rkey. (rkey charset allows `[A-Za-z0-9._:~-]`, so `mbid:…uuid….best` is valid.)

> Alternative considered: a single `app.bff.artistPicks` record per artist holding all three. Cleaner "trio" semantics but worse for the social feed (each tag event wants its own `createdAt`, URI, and to be independently likeable/repliable). We went per-pick. The `lexicons/README.md` documents both if you want to revisit.

### Reading
- **Your picks / Profile:** `agent.com.atproto.repo.listRecords({ repo: did, collection: 'app.bff.pick' })`, then group by artist for the trio view, or by `kind` for the by-tag view.
- **An artist's page (your slots):** filter your `listRecords` by `artistKey`.
- **Discover (people you follow):** for the first version, fetch each followed account's `app.bff.pick` records and merge by `createdAt`. **This does not scale** — a production Discover needs an **AppView** (a service that subscribes to the firehose, indexes `app.bff.pick`, and exposes query lexicons like `app.bff.getDiscoverFeed`). That AppView is the explicit next milestone and is out of scope here.

---

## Project layout (`starter/`)
```
starter/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   └── client-metadata.json        # OAuth client metadata (edit origin for prod)
├── lexicons/
│   └── app/bff/pick.json           # copy of the lexicon (source of truth in ../lexicons)
└── src/
    ├── main.tsx                    # mounts App, QueryClient, SessionProvider
    ├── App.tsx                     # <Routes>: / /artist/:key /you /login /callback + auth guard
    ├── styles/tokens.css           # design tokens (colors, fonts, radii, shadows)
    ├── lib/
    │   ├── oauth.ts                # BrowserOAuthClient factory (dev loopback + prod)
    │   ├── session.tsx             # SessionProvider + useSession() (holds Agent + did)
    │   ├── types.ts                # AppBffPick TS types matching the lexicon
    │   └── pick.ts                 # rkey helper + put/list/delete pick helpers (TODOs)
    └── routes/
        ├── Login.tsx               # handle input → signIn()  (matches design Login)
        ├── Callback.tsx            # completes OAuth, redirects to /
        ├── Discover.tsx            # stub → build to design (Discover)
        ├── Artist.tsx              # stub → build to design (Artist · set your three)
        └── Profile.tsx             # stub → build to design (Profile · trios)
```

## Run steps
Tasks live in `mise.toml` at the repo root and run from there. mise also provides Node.
```bash
mise trust && mise install   # once: trust the config and install Node
mise run dev       # Vite dev server: http://127.0.0.1:5173. Sign in with a real Bluesky handle (dev loopback client)
mise run test      # Vitest suite + Node server tests
mise run build     # typecheck and build the SPA into starter/dist
mise run serve     # build, then serve starter/dist + /api with the Node server on :8080
mise run serve:watch  # serve, then rebuild and restart on source changes (watchexec)
mise run restart   # stop, rebuild, and serve again
mise run stop      # stop the dev server or Node server
```
`dev`, `test`, `build` and `serve` run `npm ci` in `starter/` first, but only when `package.json` or `package-lock.json` changed.

The dev server binds `127.0.0.1` (RFC 8252 loopback redirects can't use `localhost`). Ports default to 5173 (`dev`) and 8080 (`serve`). When `$SESH_SESSION_PORT` is set, both use it instead. Sesh sets that variable per worktree session, so parallel sessions each get their own port. When the variable is set, Vite exits if the port is taken instead of moving to another one. The OAuth redirect comes from the page's origin, so any port works. `stop` only stops `node` processes listening on those ports, and Sesh runs it as teardown before deleting a worktree.

For production, the image works at any URL with no build-time config. The Node server builds `/client-metadata.json` per request from the forwarded host (`server/metadata.js`), and on a public host the browser uses `<origin>/client-metadata.json` as its `client_id` (`oauth.ts`). Set `APP_URL` on the container to pin the origin. Set `VITE_OAUTH_CLIENT_ID` at build time only if the metadata is hosted elsewhere.

## Suggested build order (next phase)
1. `src/lib/pick.ts` — implement `putPick`, `listMyPicks`, `deletePick` (signatures provided).
2. **Artist** route — the "set your three" slots + discography, writing via `putPick`.
3. **Profile** route — group `listMyPicks` into trios / by-tag rails.
4. **Discover** route — follows-merge version first; plan the AppView.
5. MusicBrainz (or your catalog source) lookup for album/artist search + cover art.
