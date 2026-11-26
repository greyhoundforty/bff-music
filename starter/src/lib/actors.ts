// Handle typeahead for the Login screen. Bluesky's public AppView indexes every
// account it has seen on the network, so this matches any handle it knows
// (.bsky.social, .tngl.sh, custom domains), not just Bluesky-hosted ones.
const TYPEAHEAD_URL = 'https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead';

export interface ActorHit {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

interface TypeaheadResponse {
  actors: ActorHit[];
}

export async function searchHandles(
  query: string,
  limit = 6,
  signal?: AbortSignal,
): Promise<ActorHit[]> {
  const q = query.trim().replace(/^@/, '').trim();
  if (!q) return [];

  const url = new URL(TYPEAHEAD_URL);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`handle search failed: ${res.status}`);

  const { actors } = (await res.json()) as TypeaheadResponse;
  return actors.map(({ did, handle, displayName, avatar }) => ({ did, handle, displayName, avatar }));
}
