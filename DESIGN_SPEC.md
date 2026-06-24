# Design spec — BFF (high-fidelity)

Source of truth for visuals: `design/Best Favorite First Hi-Fi.dc.html`. This doc extracts the exact tokens and per-screen specs so you can rebuild without reverse-engineering the HTML.

## Design tokens

### Type
| Role | Family | Weights | Usage |
|---|---|---|---|
| Display | **Instrument Serif** | 400 (+ italic) | Wordmark, page titles, artist names, column headers, card album titles in feed sentences. Used large (24–56px). |
| UI / body | **Hanken Grotesk** | 400 / 500 / 600 / 700 | All controls, body copy, album/artist labels in cards. |
| Mono labels | **Space Mono** | 400 / 700 | Kickers, meta (`@handle · 2m`), small captions, the `@` in the handle field. |

Google Fonts import:
```
https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Space+Mono:wght@400;700&display=swap
```

### Color (exact hex)
```
--page-bg:        #F1EADD   /* warm cream; app background (subtle 3px radial dot grain at rgba(34,31,27,.022)) */
--surface:        #FBF8F1   /* cards, inputs, top bar fill */
--ink:            #221F1B   /* primary text, dark buttons */
--ink-2:          #3A352E   /* secondary text, nav labels */
--muted:          #6A645A   /* tertiary text */
--faint:          #9A9183   /* meta, placeholders, captions */
--hairline:       #E7DFD0   /* card borders */
--hairline-2:     #E3DBCC   /* top bar / control borders */
--divider:        #EEE7D8   /* dashed/solid inner dividers */
--control-bg:     #E9E0D0   /* segmented-control track */

/* Brand — three picks */
--best:    #C2902F;  --best-tint:  #F4E7C2;  --best-ink:  #6E4E12;  --best-bd:  #E6D09A;   /* ★ */
--fav:     #CC6B52;  --fav-tint:   #F6D9CD;  --fav-ink:   #7A3322;  --fav-bd:   #EBBBA9;   /* ♥ */
--first:   #2E9E78;  --first-tint: #CFEADD;  --first-ink: #1F5A40;  --first-bd: #ABD8C1;   /* ① */
--on-brand: #FBF6EA;  /* glyph color on solid brand chips */
```
Glyphs: Best `★` (U+2605), Favorite `♥` (U+2665), First `①` (U+2460). Keep this glyph+color mapping everywhere.

### Generative art (placeholders — replace with real cover art / avatars later)
Deterministic from a hash of a key string, `hash(s) = s.split('').reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0, 0)`, index into a palette:
```
covers  = ['#33524F','#A8492B','#C28A30','#5A3A55','#2B5A3A','#27374C','#9A4327','#69703F','#8E5235','#46604B','#7A5230','#3F3A53']  // key: album+artist
avatars = ['#E7D7B8','#EBC9BA','#CDE5D6','#DED7C6','#E3C9CE','#CFE0DF','#E8D9C0']  // key: handle/artist
```
- **Cover tile:** colored square, `border-radius` 8–12px, `box-shadow: inset 0 0 0 1px rgba(0,0,0,.07)`, with two soft circles — light `rgba(255,250,238,.16)` top-right (~60% dia, offset −16%) and dark `rgba(0,0,0,.15)` bottom-left (~34% dia). Reads as abstract album art.
- **Avatar:** circle filled with the avatar color, initial centered in Instrument Serif, color `--ink-2`.

### Radii / shadow / layout
```
radius: pills & badges 8px · inputs/segmented 11px · cards 14–16px · login card 20px
shadow-card:     0 1px 2px rgba(34,31,27,.04)
shadow-elevated: 0 1px 2px rgba(34,31,27,.05), 0 20px 50px rgba(34,31,27,.08)   /* login card */
content max-width: 1140px, centered
top bar padding: 13px 28px · content padding: 34px 28px 90px
grid gaps: 18–20px · card inner padding: 13–16px
```

## Global chrome — Top bar (all screens except Login)
Sticky, `background: rgba(241,234,221,.82)` + `backdrop-filter: blur(12px)`, bottom border `--hairline-2`. Inner row max-width 1140px:
- **Wordmark** (left, clickable → Discover): three 21px rounded-6px squares filled `--best` / `--fav` / `--first` with white glyphs `★ ♥ ①`, then "BFF" in Instrument Serif 27px.
- **Nav:** `Discover` `Artists` `You` — Hanken 15px/500, color `--ink-2`. Active item has a 2.5px rounded `--ink` underline bar. Maps to routes `/`, `/artist/:key`, `/you`.
- **Search** (decorative for now): pill, `--surface` fill, `--hairline-2` border, radius 11px, placeholder "search artists, albums, people" in `--faint`.
- **Sign out** text link (→ Login) + **avatar** 38px circle (→ Profile).

## Screens

### 1. Login  (`/login`) — matches design exactly, build this now
Centered single column, width 392px, no top bar, on `--page-bg`. Wordmark lockup above an elevated card (radius 20px, `shadow-elevated`, `--surface`):
- Title (Instrument Serif 30px): "Tag the albums that matter."
- Sub (14px `--muted`): "Sign in with your handle on any AT Protocol server."
- Label "Your handle" (13px/600 `--ink-2`).
- Handle field: row, 1.5px `--ink` border, radius 11px, white fill. Left addon: `@` in Space Mono on `--page-bg` with right divider; then the text input (placeholder `you.bsky.social`, `--faint`).
- Primary button (full width): `--ink` bg, `--page-bg` text, radius 11px, 600 — "Continue →". **On submit:** `signIn(handle)` (see `oauth.ts`).
- Secondary text link: "Use a custom server (PDS)" (underlined `--muted`) — optional advanced entry; for now it can no-op or focus the field.
- Footer note (12px `--faint`, top divider): "Bluesky or your own server — we redirect you there to sign in. We never see your password."
- Below the card: "Browse without signing in ›" (`--faint`) → `/` in a logged-out/preview state (optional).

### 2. Discover  (`/`) — placeholder now, build next phase
Hero: Space Mono kicker "WHAT PEOPLE ARE NAMING", Instrument Serif 46px "Discover", and a **Following / Everyone** segmented control (right). **Hero layout = three columns** Best / Favorite / First; each column = a header (solid brand square + Instrument Serif label + Space Mono caption "the peak" / "yours" / "start here") over a stack of cards. Card: 60px cover + album (16px/600) + artist (13px `--muted`) + meta (`@handle · 2m`, Space Mono `--faint`). Data: each user's `app.bff.pick` records from follows, grouped by `kind`.
> The hi-fi also includes two alternate Discover layouts behind a `feedLayout` tweak — **grid** (activity cards, badge on cover) and **timeline** (social sentences + sidebar). Treat columns as the primary; the others are reference if you want a denser or more social variant.

### 3. Artist  (`/artist/:key`) — placeholder now, build next phase
Header: 120px cover tile + Space Mono "ARTIST" kicker + Instrument Serif 56px artist name + stats line ("9 albums · 4,210 taggers · **you've set 2 of 3**"). Primary tool = **"Set your three"**: three slot cards (Best / Favorite / First), each with a colored top border (`--best`/`--fav`/`--first`), a brand square + label, and either the filled album (cover + title + year + "replace") or an empty dashed dropzone ("Drag an album here / or pick from below"). Below: **Discography** grid (3-col) of album rows with a drag handle, cover, title/year, the current tag glyph (if any), and a `···` menu. Writing a slot = `putPick({ artist, album, kind })`.
> Alternate tools behind `artistTool` tweak: **toggles** (a sticky picks bar + per-album Best/Fav/First buttons that move exclusively) and **guided** (a calm 3-question flow). Columns/slots are primary.

### 4. Profile  (`/you`) — placeholder now, build next phase
Header: 84px avatar + Instrument Serif 38px `@handle` + stats ("12 artists set · 36 tags given · joined 2026") + "Edit picks" button. **By artist / By tag** segmented control. **By artist (primary):** 2-col grid of trio cards — artist avatar(initial)+name, then three rows (Best/Favorite/First chip + album title); an unset First shows a dashed "+ set a starter". **By tag:** three horizontal rails (Your Bests / Favorites / Firsts) of 132px cover cards. Data: your `listRecords('app.bff.pick')` grouped by artist (sets) or by `kind` (rails).

## Interactions & state
- **Routing/nav:** top-bar nav switches screens; auth guard redirects unauthed → `/login` and authed-on-`/login` → `/`.
- **Segmented controls** (Following/Everyone, By artist/By tag): local UI state, swap active styling (active = `--surface` fill + 600 + `shadow-card`; inactive = transparent + `--muted`).
- **Login submit:** async `signIn`; show pending state on the button; errors (bad handle / resolution failure) surface inline under the field.
- **Tagging (next phase):** optimistic `putPick`; "one per (artist, kind)" means selecting a new album for a slot overwrites the existing record at the deterministic rkey.
- **Loading/empty:** lists need skeletons (cover-shaped shimmer) and empty states ("set a starter", empty Favorite slot dropzone shown in design).

## State to manage
- **Session:** `{ agent, did, handle }` from `SessionProvider` (atproto OAuth). `null` = logged out.
- **Per-screen UI:** active segmented tab; (Artist) drag/selection state; (Login) handle string + pending/error.
- **Server state (next phase):** `listMyPicks` (TanStack Query, keyed by did), follows' picks for Discover. Mutations: `putPick` / `deletePick` invalidate the picks query.

## Assets
No raster assets. Cover art and avatars are **generative placeholders** (palettes above) — swap for real cover art (Cover Art Archive via MBID) and atproto profile avatars when catalog/profile lookup lands. Fonts via Google Fonts (above). Icons are the three Unicode glyphs; any other icons (search ⌖, reply ↩, heart ♡) are Unicode in the design — replace with your icon set if preferred.
