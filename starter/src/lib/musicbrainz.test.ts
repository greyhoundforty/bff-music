import { describe, it, expect } from 'vitest';
import { toArtistRef, toAlbumRef } from './musicbrainz';
import type { MBArtist, MBReleaseGroup } from './musicbrainz';

describe('musicbrainz toArtistRef', () => {
  it('builds an ArtistRef with mbid from an MBArtist', () => {
    const artist: MBArtist = {
      id: 'e391fdf1-b152-4b5c-bf05-b3fd21ba1d83',
      name: 'Gorillaz',
      sortName: 'Gorillaz',
      score: 100,
    };
    const ref = toArtistRef(artist);
    expect(ref.name).toBe('Gorillaz');
    expect(ref.mbid).toBe('e391fdf1-b152-4b5c-bf05-b3fd21ba1d83');
  });
});

describe('musicbrainz toAlbumRef', () => {
  it('builds an AlbumRef with mbid, year, and coverUrl from an MBReleaseGroup', () => {
    const rg: MBReleaseGroup = {
      id: '25b7b584-d952-4662-a8b9-dd8cdfbbd4c6',
      title: 'Demon Days',
      primaryType: 'Album',
      firstReleaseDate: '2005-05-23',
    };
    const ref = toAlbumRef(rg);
    expect(ref.title).toBe('Demon Days');
    expect(ref.mbid).toBe('25b7b584-d952-4662-a8b9-dd8cdfbbd4c6');
    expect(ref.year).toBe('2005');
    expect(ref.coverUrl).toContain('25b7b584-d952-4662-a8b9-dd8cdfbbd4c6');
  });
});
