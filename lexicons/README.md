# Lexicons — `app.bff.*`

AT Protocol lexicon schemas for BFF. These define the on-network data shapes. The schema here is the **source of truth**; keep `starter/src/lib/types.ts` in sync (or generate types with `@atproto/lex-cli`).

> **NSID namespace.** `app.bff` is a placeholder. Before going to production you should control the reverse-DNS domain (`bff.app` → `app.bff`) or pick a namespace you own, and update every `id`/`$type`. Don't ship records under a namespace you don't control.

## Records

### `app.bff.pick` (`app/bff/pick.json`)
One Best / Favorite / First pick for one artist, in the author's repo.

- **Collection:** `app.bff.pick`
- **Record key (rkey):** deterministic — `` `${artistKey}.${kind}` `` where
  `artistKey = mbid ? \`mbid:${mbid}\` : \`name:${slug(name)}\``
  This guarantees **one pick per (artist, kind)** without a server-side unique constraint. See `starter/src/lib/pick.ts` for the helper.
- **Write:** `putRecord` (create-or-overwrite). **Remove:** `deleteRecord`.
- **Fields:** `kind` enum, `artist` (`#artistRef`), `album` (`#albumRef`), optional `note`, `createdAt`.

Albums and artists are **external entities**, not atproto records, so each pick embeds a lightweight reference (display name + optional MusicBrainz MBID + year + cover URL). MBIDs make picks portable and dedupable across users.

## Validating
```bash
npx @atproto/lex-cli validate lexicons/app/bff/pick.json
# generate TS types (optional, instead of hand-maintaining types.ts):
npx @atproto/lex-cli gen-api ./src/lexicon lexicons/app/bff/pick.json
```

## Design alternative (recorded, not used)
A single **`app.bff.artistPicks`** record per artist holding `best` / `favorite` / `first` sub-objects (rkey = `artistKey`). Pros: models the "trio" directly, one `putRecord` updates the whole set, trivially enforces one-of-each. Cons: the social Discover feed wants each tag to be an independent event with its own `uri`, `createdAt`, likes, and replies — awkward when three picks share one record. **We chose per-pick records** (`app.bff.pick`). If the product leans less social and more "manage my trios," revisit this.

## Next-phase lexicons (not in this pass)
For a scalable Discover feed you'll add an **AppView** with query lexicons, e.g.:
- `app.bff.getActorPicks` — params `{ actor }` → that user's picks (skeleton/hydrated).
- `app.bff.getDiscoverFeed` — params `{ viewer, cursor }` → merged recent picks from follows + back-fill.
- `app.bff.defs` — shared `pickView`, `artistView` outputs.

These are documented here only so the record shape above stays forward-compatible; building the AppView (firehose consumer + index) is a separate milestone.
