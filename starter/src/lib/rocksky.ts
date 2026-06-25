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

export interface RockskyAlbum {
  id: string;
  uri: string;
  title: string;
  artist: string;
  artistUri: string;
  year: number;
  albumArt: string;
  releaseDate: string;
  playCount: number;
  uniqueListeners: number;
}

/** Fetch accounts the given DID follows on Rocksky. */
export async function getRockskyFollows(did: string, limit = 100): Promise<RockskyFollow[]> {
  const data = await xrpc<{ follows: RockskyFollow[] }>(
    'app.rocksky.graph.getFollows',
    { actor: did, limit },
  );
  return data.follows ?? [];
}

/** Fetch globally popular albums on Rocksky, sorted by play count. */
export async function getTopAlbums(limit = 30): Promise<RockskyAlbum[]> {
  const data = await xrpc<{ albums: RockskyAlbum[] }>(
    'app.rocksky.album.getAlbums',
    { limit },
  );
  return data.albums ?? [];
}
