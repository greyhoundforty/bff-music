# Handoff: Best · Favorite · First — initial code wire-up

## Overview
**Best · Favorite · First (BFF)** is a music-tagging social app. For any artist, a person sets exactly three picks:

| Pick | Glyph | Meaning |
|------|-------|---------|
| **Best** | ★ | The artist's objective peak |
| **Favorite** | ♥ | The one *you* love most |
| **First** | ① | Where a newcomer should start |

A **Discover** feed shows what the people you follow are naming; an **Artist** page lets you set your three; a **Profile** collects your picks as one trio per artist. Auth is **AT Protocol** (Bluesky and any compatible server) and each pick is stored as a **record in the user's own repo (PDS)**.

This package covers the **first wire-up**: project skeleton + routing, OAuth/session wiring, and the lexicon schemas for the pick records. Building out the screen UIs and the read/write/feed logic is the next phase (stubs and a clear map are included).

## About the design files
The files in `design/` are **design references created in HTML** — high-fidelity prototypes showing the intended look and behavior. **They are not production code to copy.** The task is to **recreate these designs in a real React + TypeScript codebase** (scaffolded here under `starter/`) using its patterns and libraries. The HTML is the source of truth for *visuals*; this README + the docs are the source of truth for *architecture and behavior*.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and component treatments are settled — see `DESIGN_SPEC.md` for exact tokens and per-screen specs. Recreate the UI to match. (A separate low-fi wireframe set, `design/Best Favorite First Wireframes.dc.html`, shows the earlier exploration and the alternate layout directions, kept for reference.)

## Decisions locked for this wire-up
- **Stack:** React + TypeScript + Vite (SPA). Routing via React Router. Data fetching via TanStack Query (recommended). See `ARCHITECTURE.md`.
- **Auth:** AT Protocol **OAuth** in the browser via `@atproto/oauth-client-browser` (handle → resolve PDS → redirect → callback → session). No passwords stored.
- **Data:** atproto-native. Each pick is an `app.bff.pick` record written to the signed-in user's repo. See `lexicons/` and `ARCHITECTURE.md`.
- **Out of scope (next phase):** a global Discover AppView/indexer, full screen UIs, blob upload for cover art. Noted where relevant.

## What's in this package
```
design_handoff_bff_wireup/
├── README.md            ← you are here (start point)
├── ARCHITECTURE.md      ← stack, atproto auth flow, data model, project layout, run steps
├── DESIGN_SPEC.md       ← screens, components, exact design tokens, interactions, state
├── CLAUDE.md            ← drop-in instructions for the Claude Code dev agent
├── lexicons/            ← app.bff.* lexicon JSON + notes
│   ├── app/bff/pick.json
│   └── README.md
├── starter/             ← runnable Vite scaffold (skeleton + routing + OAuth + types)
│   └── …                ← see ARCHITECTURE.md "Project layout"
└── design/              ← the HTML design references (hi-fi + wireframes)
    ├── Best Favorite First Hi-Fi.dc.html
    ├── Best Favorite First Wireframes.dc.html
    └── support.js
```

## How a developer should use this
1. Read `ARCHITECTURE.md` end-to-end — it explains the atproto auth flow and the record model, which are the non-obvious parts.
2. Copy `starter/` into a new repo (or run it in place), then `npm install` and `npm run dev`. The OAuth flow and routing work out of the box against a local dev client; the four routes render placeholders.
3. Open the `design/` HTML files in a browser as the visual reference and build each route to match, following `DESIGN_SPEC.md`.
4. Implement the read/write helpers in `src/lib/pick.ts` (signatures + TODOs provided) to make the screens live.

## Files in the parent project that contain the design
- `Best Favorite First Hi-Fi.dc.html` — the hi-fi (copied into `design/`)
- `Best Favorite First Wireframes.dc.html` — the wireframes (copied into `design/`)
- `support.js` — runtime for the `.dc.html` files (copied into `design/` so they open standalone)
