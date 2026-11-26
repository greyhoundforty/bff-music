# Login handle typeahead — design

**Date:** 2026-11-26 · **Size:** small change · **Status:** awaiting approval

## Intent
On `/login`, people shouldn't have to type their full handle from memory. As they type, show matching AT Protocol accounts (avatar + handle), like Tangled's login (tangled.org/login). Picking one fills the handle field. It's the first of several feature additions.

## Goals
- Typing in "Your handle" shows up to 6 matching accounts after a short pause.
- Each row: avatar (or a fallback) + handle, keyboard and mouse selectable.
- Picking a row fills the field with that handle. The person still presses **Continue →**, so nothing signs in by surprise.
- Works for any handle on the network the Bluesky index knows (`.bsky.social`, `.tngl.sh`, custom domains), and identically in `mise run dev` and the deployed image.

## Non-goals
- Remembering past sign-ins on this browser (possible follow-up).
- The "custom server (PDS)" input and guest mode (existing TODOs, separate work).
- Any change to how sign-in itself works (`signIn(handle)` stays as is).

## Anti-goals
- Typing must never be blocked or slowed by the search. If the search fails or is slow, the field behaves exactly like today, with no error shown.
- Never require a match: a handle that isn't in the index must still sign in normally.

## Approaches considered
1. **Browser calls Bluesky's public typeahead directly. Chosen.** `GET https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=<text>&limit=6`. No auth, CORS `*` (verified 2026-11-26), returns `did, handle, displayName, avatar`. No server code, works in dev and prod alike. Trade-off: the visitor's browser sends partial handles to Bluesky, as Tangled does. Sign-in already resolves handles via `bsky.social`.
2. **Proxy through our Node server (`/api/handle-search`).** Hides visitors from Bluesky and allows caching, but only exists when the Node server runs (dev would need a Vite proxy) and moves toward a backend the project avoids. Rejected.

## Design
- **`lib/actors.ts` (new):** `searchHandles(q, limit)` → `{ did, handle, displayName?, avatar? }[]`. Strips a leading `@`, returns `[]` for an empty query, and throws on non-200 (the caller swallows the error). atproto lookup logic stays in `lib/`, per CLAUDE.md.
- **Login input:** same debounce (~250 ms) and keyboard pattern as `ArtistSearch.tsx`: ↓/↑ to move, Enter selects the highlighted row (otherwise Enter submits the form as today), Esc closes, and clicking outside closes. Ignore out-of-order responses so a slow early request can't overwrite newer results.
- **Dropdown look:** matches the existing artist dropdown and the Login tokens: `--surface`, 1px `--hairline`, `--r-card` radius, `--shadow-elevated`, opens below the field. Each row has a 28px round avatar (fallback: a disc in the brand colours ★♥①, picked from the DID so it's stable), the handle (14px/500 `--ink`), and the display name if present (12px `--faint`). Highlighted row uses `--page-bg`.
- **Accessibility:** combobox roles (`role="combobox"`, `aria-expanded`, `aria-activedescendant`, `role="listbox"` and `option`), so screen readers announce results.
- **Tests:** Vitest for `searchHandles` (URL building, `@` stripping, empty query, error) with `fetch` mocked. Manually check the dropdown in the browser, including that keyboard input on the field still works (per the global CLAUDE.md rule for UI input changes).

## Left to the builder
- Whether to pull a shared dropdown component out of `ArtistSearch` now or later. Fine either way; don't refactor `ArtistSearch`'s behaviour.
- Exact debounce value within 200–300 ms.
