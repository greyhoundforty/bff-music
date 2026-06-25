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

/**
 * Fetch BFF picks from everyone the signed-in user follows on Rocksky,
 * sorted newest-first.
 *
 * TODO(AppView): replace with app.bff.getDiscoverFeed once an AppView is live.
 */
export async function fetchFollowsPicks(agent: Agent, did: string): Promise<AuthoredPick[]> {
  const rsFollows = await getRockskyFollows(did).catch(() => []);

  const followMap = new Map(
    rsFollows.map(f => [f.did, { handle: f.handle, avatar: f.avatar }]),
  );

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

  authored.sort(
    (a, b) => new Date(b.pick.value.createdAt).getTime() - new Date(a.pick.value.createdAt).getTime(),
  );

  return authored;
}
