const BASE = 'https://api.rocksky.app/xrpc';

async function xrpc<T>(method: string, params: Record<string, string | number>): Promise<T> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  ).toString();
  const res = await fetch(`${BASE}/${method}?${qs}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Rocksky ${method} ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface RockskyFollow {
  id: string;
  did: string;
  handle: string;
  displayName: string;
  avatar: string;
}

/** Fetch accounts the given DID follows on Rocksky. */
export async function getRockskyFollows(did: string, limit = 100): Promise<RockskyFollow[]> {
  const data = await xrpc<{ follows: RockskyFollow[] }>(
    'app.rocksky.graph.getFollows',
    { actor: did, limit },
  );
  return data.follows ?? [];
}
