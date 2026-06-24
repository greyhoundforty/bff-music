import { describe, it, expect } from 'vitest';
import { groupPicksByKind } from './discover';
import type { AuthoredPick } from './discover';
import type { PickRecord } from './types';

function makePick(kind: 'best' | 'favorite' | 'first', did: string): AuthoredPick {
  const record: PickRecord = {
    uri: `at://${did}/app.bff.pick/${kind}`,
    value: {
      kind,
      artist: { name: 'Test Artist' },
      album: { title: 'Test Album' },
      createdAt: new Date().toISOString(),
    },
  };
  return { pick: record, authorDid: did, authorHandle: `user.bsky.social` };
}

describe('groupPicksByKind', () => {
  it('partitions picks into three buckets', () => {
    const picks: AuthoredPick[] = [
      makePick('best', 'did:plc:aaa'),
      makePick('favorite', 'did:plc:bbb'),
      makePick('first', 'did:plc:ccc'),
      makePick('best', 'did:plc:ddd'),
    ];
    const grouped = groupPicksByKind(picks);
    expect(grouped.best).toHaveLength(2);
    expect(grouped.favorite).toHaveLength(1);
    expect(grouped.first).toHaveLength(1);
  });

  it('returns empty arrays when no picks', () => {
    const grouped = groupPicksByKind([]);
    expect(grouped.best).toHaveLength(0);
    expect(grouped.favorite).toHaveLength(0);
    expect(grouped.first).toHaveLength(0);
  });
});
