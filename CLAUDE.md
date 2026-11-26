# Instructions for Claude Code — BFF wire-up

You are implementing **Best · Favorite · First (BFF)**, a music-tagging app on AT Protocol. This folder is a design + architecture handoff. Read in this order: `README.md` → `ARCHITECTURE.md` → `DESIGN_SPEC.md` → `lexicons/README.md`.

## Your task for this pass
Stand up the app skeleton and make **auth + routing** work end to end, with the **lexicon** in place. Do **not** fully build the screen UIs or the feed yet — those are the next milestone. Concretely:
1. Get `starter/` running (`npm install && npm run dev`).
2. Confirm the OAuth round-trip works: Login → approve on PDS → Callback → authed, `useSession()` exposes an `Agent` and the user's `did`.
3. Confirm routing + the auth guard (unauthed → `/login`; authed visiting `/login` → `/`).
4. Validate `lexicons/app/bff/pick.json` and keep `starter/src/lib/types.ts` in sync with it.

## Ground rules
- **The HTML in `design/` is a reference, not source.** Rebuild it as React components using the tokens in `DESIGN_SPEC.md`. Don't import or transclude the `.dc.html` files.
- **Match the hi-fi exactly** when you do build screens: fonts (Instrument Serif / Hanken Grotesk / Space Mono), the warm paper palette, and the Best=amber ★ / Favorite=coral ♥ / First=green ① color system. Exact hex + sizes are in `DESIGN_SPEC.md`.
- **atproto specifics live in `lib/`.** Keep OAuth/session/record logic out of components; components call `useSession()` and helpers in `pick.ts`.
- **Picks are records in the user's repo.** One pick per `(artist, kind)`, enforced by the deterministic rkey `${artistKey}.${kind}` (see `ARCHITECTURE.md` → "Data model"). Writes are `putRecord` (create-or-overwrite).
- Don't invent a backend. There is no app server in this phase. A global Discover feed needs an AppView later — leave a clear TODO, don't stub a fake API.
- Keep `lexicons/app/bff/pick.json` as the schema source of truth; if you change it, regenerate/update the TS types.

## Definition of done (this pass)
- [ ] `npm run dev` serves the app with no console errors.
- [ ] Signing in with a real Bluesky handle completes and persists across reload.
- [ ] `useSession()` returns `{ agent, did, handle }` when authed, `null` when not.
- [ ] All five routes resolve; placeholders render for the three app screens; Login matches the design.
- [ ] `pick.ts` exports typed `putPick` / `listMyPicks` / `deletePick` (bodies may be TODO but signatures + rkey logic are real).

## Watch out for
- **Client metadata / `client_id`.** In dev, use the loopback client (no hosted metadata needed). In prod, nothing is baked in: the Node server builds `/client-metadata.json` per request from the forwarded host (`server/metadata.js`), and `oauth.ts` uses `<origin>/client-metadata.json` as `client_id`, so one image works at any URL. Don't reintroduce a static `public/client-metadata.json`; it would hardcode one deployment's URL. `APP_URL` (container env) pins the origin; `VITE_OAUTH_CLIENT_ID` (build arg) overrides the client_id only when the metadata is hosted elsewhere.
- **Scope must include `transition:generic`** or `putRecord` will be rejected.
- **Run `oauthClient.init()` once on app load** before deciding auth state; it both completes a pending callback and restores an existing session.
- Album/artist references are embedded strings + optional MBID, **not** atproto records — don't try to create records for albums.
