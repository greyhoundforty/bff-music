import type { ArtistRef, AlbumRef } from './types';

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

// ── Response types (verified against live API 2026-06-24) ────────────────────

export interface RockskyArtist {
  id: string;
  name: string;
  picture: string;
  uri: string;
  genres: string[];
  playCount: number;
  uniqueListeners: number;
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

export interface RockskyFollow {
  id: string;
  did: string;
  handle: string;
  displayName: string;
  avatar: string;
}

// ── Converters ────────────────────────────────────────────────────────────────

/** Convert a Rocksky artist to an ArtistRef for embedding in a pick record. */
export function toArtistRef(artist: RockskyArtist): ArtistRef {
  return { name: artist.name };
  // mbid: Rocksky does not currently expose MBIDs — add when available.
}

/** Convert a Rocksky album to an AlbumRef for embedding in a pick record. */
export function toAlbumRef(album: RockskyAlbum): AlbumRef {
  return {
    title: album.title,
    year: String(album.year),
    coverUrl: album.albumArt || undefined,
  };
  // mbid: Rocksky does not currently expose MBIDs — add when available.
}

// ── API calls ─────────────────────────────────────────────────────────────────

/** Search Rocksky for artists by name. */
export async function searchArtists(q: string, limit = 10): Promise<RockskyArtist[]> {
  if (!q.trim()) return [];
  const data = await xrpc<{ artists: RockskyArtist[] }>(
    'app.rocksky.artist.getArtists',
    { q: q.trim(), limit },
  );
  return data.artists ?? [];
}

/** Fetch all albums for a Rocksky artist (by their AT URI). */
export async function getArtistAlbums(artistUri: string, limit = 50): Promise<RockskyAlbum[]> {
  const data = await xrpc<{ albums: RockskyAlbum[] }>(
    'app.rocksky.artist.getArtistAlbums',
    { uri: artistUri, limit },
  );
  return data.albums ?? [];
}

/** Fetch accounts the given DID follows on Rocksky. */
export async function getRockskyFollows(did: string, limit = 100): Promise<RockskyFollow[]> {
  const data = await xrpc<{ follows: RockskyFollow[] }>(
    'app.rocksky.graph.getFollows',
    { actor: did, limit },
  );
  return data.follows ?? [];
}
