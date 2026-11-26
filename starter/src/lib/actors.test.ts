import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchHandles } from './actors';

const ENDPOINT = 'https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead';

let fetchMock: ReturnType<typeof vi.fn>;

function respond(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  fetchMock.mockResolvedValue({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  });
}

function calledUrl(): URL {
  return new URL(String(fetchMock.mock.calls[0][0]));
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('searchHandles', () => {
  it('builds the typeahead URL', async () => {
    respond({ actors: [] });
    await searchHandles('grey');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = calledUrl();
    expect(url.origin + url.pathname).toBe(ENDPOINT);
    expect(url.searchParams.get('q')).toBe('grey');
    expect(url.searchParams.get('limit')).toBe('6');
  });

  it('strips @ and whitespace', async () => {
    respond({ actors: [] });
    await searchHandles('  @grey ');
    expect(calledUrl().searchParams.get('q')).toBe('grey');
  });

  it('returns [] for an empty query without fetching', async () => {
    expect(await searchHandles('  @ ')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps actors to hits', async () => {
    respond({
      actors: [
        { did: 'did:plc:a', handle: 'a.bsky.social', displayName: 'A', avatar: 'https://x/a.jpg', labels: [] },
        { did: 'did:plc:b', handle: 'b.tngl.sh' },
      ],
    });
    expect(await searchHandles('a')).toEqual([
      { did: 'did:plc:a', handle: 'a.bsky.social', displayName: 'A', avatar: 'https://x/a.jpg' },
      { did: 'did:plc:b', handle: 'b.tngl.sh', displayName: undefined, avatar: undefined },
    ]);
  });

  it('throws on a non-OK response', async () => {
    respond({}, { ok: false, status: 500 });
    await expect(searchHandles('grey')).rejects.toThrow(/500/);
  });

  it('passes the abort signal through', async () => {
    respond({ actors: [] });
    const controller = new AbortController();
    await searchHandles('grey', 6, controller.signal);
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal);
  });
});
