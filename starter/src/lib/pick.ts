import type { Agent } from '@atproto/api';
import {
  PICK_COLLECTION,
  type AppBffPick,
  type ArtistRef,
  type PickKind,
  type PickRecord,
} from './types';

// ── Deterministic record key ────────────────────────────────────────────────
// One pick per (artist, kind) is enforced by encoding it into the rkey, so a
// write is a create-or-overwrite (putRecord) rather than an append.

export function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'unknown'
  );
}

export function artistKey(artist: ArtistRef): string {
  return artist.mbid ? `mbid:${artist.mbid}` : `name:${slug(artist.name)}`;
}

/** e.g. "mbid:a74b1b7f-….best"  — valid rkey charset [A-Za-z0-9._:~-]. */
export function pickRkey(artist: ArtistRef, kind: PickKind): string {
  return `${artistKey(artist)}.${kind}`;
}

// ── Write ────────────────────────────────────────────────────────────────────

/** Create or overwrite the signed-in user's pick for (artist, kind). */
export async function putPick(
  agent: Agent,
  input: Omit<AppBffPick, '$type' | 'createdAt'> & { createdAt?: string },
) {
  const record: AppBffPick = {
    $type: PICK_COLLECTION,
    kind: input.kind,
    artist: input.artist,
    album: input.album,
    ...(input.note ? { note: input.note } : {}),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
  return agent.com.atproto.repo.putRecord({
    repo: agent.assertDid,
    collection: PICK_COLLECTION,
    rkey: pickRkey(input.artist, input.kind),
    record,
  });
  // TODO(next phase): invalidate the picks query (TanStack) / optimistic update at call site.
}

// ── Read ───────────────────────────────────────────────────────────────────--

/** List all of an actor's picks (defaults to the signed-in user). Paginates. */
export async function listMyPicks(agent: Agent, repo?: string): Promise<PickRecord[]> {
  const did = repo ?? agent.assertDid;
  const out: PickRecord[] = [];
  let cursor: string | undefined;
  do {
    const res = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: PICK_COLLECTION,
      limit: 100,
      cursor,
    });
    for (const r of res.data.records) {
      out.push({ uri: r.uri, cid: r.cid, value: r.value as AppBffPick });
    }
    cursor = res.data.cursor;
  } while (cursor);
  return out;
  // TODO(next phase): group by artistKey (Profile "by artist" trios) or by kind
  // (Discover columns / "by tag" rails). For a global Discover feed across the
  // people you follow you'll need an AppView — see ARCHITECTURE.md.
}

// ── Delete ───────────────────────────────────────────────────────────────────

export async function deletePick(agent: Agent, artist: ArtistRef, kind: PickKind) {
  return agent.com.atproto.repo.deleteRecord({
    repo: agent.assertDid,
    collection: PICK_COLLECTION,
    rkey: pickRkey(artist, kind),
  });
}
