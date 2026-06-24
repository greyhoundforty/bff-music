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
    getAtProtoFollows(agent, did).catch((): BskyFollow[] => []),
    getRockskyFollows(did).catch(() => []),
  ]);

  const followMap = new Map<string, { handle: string; displayName?: string; avatar?: string }>();
  for (const f of atFollows) {
    followMap.set(f.did, { handle: f.handle, displayName: f.displayName, avatar: f.avatar });
  }
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
        authored.push({
          pick,
          authorDid: batch[j],
          authorHandle: meta.handle,
          authorAvatar: meta.avatar,
        });
      }
    }
  }

  // Sort newest-first.
  authored.sort(
    (a, b) =>
      new Date(b.pick.value.createdAt).getTime() - new Date(a.pick.value.createdAt).getTime(),
  );

  return authored;
}
