import type { ArtistRef, AlbumRef } from './types';

const BASE = 'https://musicbrainz.org/ws/2';
const UA = 'BFF/0.1 (https://github.com/greyhoundforty/bff)';
const CAA = 'https://coverartarchive.org';

async function mbFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, fmt: 'json' }).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) throw new Error(`MusicBrainz ${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export interface MBArtist {
  id: string;
  name: string;
  sortName: string;
  disambiguation?: string;
  score?: number;
}

export interface MBReleaseGroup {
  id: string;
  title: string;
  primaryType?: string;
  firstReleaseDate?: string;
  secondaryTypes?: string[];
}

// Secondary types that indicate non-studio releases — excluded from the discography grid.
const EXCLUDED_SECONDARY = new Set([
  'Compilation', 'Live', 'Remix', 'DJ-mix', 'Mixtape/Street',
  'Demo', 'Interview', 'Spokenword', 'Audiobook', 'Audio drama',
  'Field recording', 'Broadcast',
]);

export function toArtistRef(artist: MBArtist): ArtistRef {
  return { name: artist.name, mbid: artist.id };
}

export function toAlbumRef(rg: MBReleaseGroup): AlbumRef {
  return {
    title: rg.title,
    mbid: rg.id,
    year: rg.firstReleaseDate?.slice(0, 4),
    coverUrl: `${CAA}/release-group/${rg.id}/front-250`,
  };
}

/** Cover Art Archive URL for a release group MBID. May 404 — use as img src with fallback. */
export function coverUrl(rgMbid: string): string {
  return `${CAA}/release-group/${rgMbid}/front-250`;
}

export async function searchArtists(q: string, limit = 10): Promise<MBArtist[]> {
  if (!q.trim()) return [];
  const data = await mbFetch<{
    artists: Array<{
      id: string;
      name: string;
      'sort-name': string;
      score: number;
      disambiguation?: string;
    }>;
  }>('/artist', { query: q.trim(), limit: String(limit) });
  return (data.artists ?? []).map(a => ({
    id: a.id,
    name: a.name,
    sortName: a['sort-name'],
    disambiguation: a.disambiguation,
    score: a.score,
  }));
}

export async function getArtistReleaseGroups(mbid: string, limit = 100): Promise<MBReleaseGroup[]> {
  const data = await mbFetch<{
    'release-groups': Array<{
      id: string;
      title: string;
      'primary-type'?: string;
      'first-release-date'?: string;
      'secondary-types'?: string[];
    }>;
  }>('/release-group', { artist: mbid, type: 'album|single|ep', limit: String(limit) });
  return (data['release-groups'] ?? [])
    .map(rg => ({
      id: rg.id,
      title: rg.title,
      primaryType: rg['primary-type'],
      firstReleaseDate: rg['first-release-date'],
      secondaryTypes: rg['secondary-types'] ?? [],
    }))
    .filter(rg => !rg.secondaryTypes?.some(t => EXCLUDED_SECONDARY.has(t)));
}
