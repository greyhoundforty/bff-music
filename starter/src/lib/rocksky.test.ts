import { describe, it, expect } from 'vitest';
import { toArtistRef, toAlbumRef } from './rocksky';
import type { RockskyArtist, RockskyAlbum } from './rocksky';

describe('toArtistRef', () => {
  it('builds an ArtistRef from a RockskyArtist with no mbid', () => {
    const artist: RockskyArtist = {
      id: 'rec_abc',
      name: 'Radiohead',
      picture: 'https://example.com/pic.jpg',
      uri: 'at://did:plc:xxx/app.rocksky.artist/3abc',
      genres: [],
      playCount: 100,
      uniqueListeners: 50,
    };
    const ref = toArtistRef(artist);
    expect(ref.name).toBe('Radiohead');
    expect(ref.mbid).toBeUndefined();
  });
});

describe('toAlbumRef', () => {
  it('builds an AlbumRef from a RockskyAlbum', () => {
    const album: RockskyAlbum = {
      id: 'rec_xyz',
      uri: 'at://did:plc:xxx/app.rocksky.album/3def',
      title: 'OK Computer',
      artist: 'Radiohead',
      artistUri: 'at://did:plc:xxx/app.rocksky.artist/3abc',
      year: 1997,
      albumArt: 'https://example.com/cover.jpg',
      releaseDate: '1997-05-28T00:00:00.000Z',
      playCount: 500,
      uniqueListeners: 200,
    };
    const ref = toAlbumRef(album);
    expect(ref.title).toBe('OK Computer');
    expect(ref.year).toBe('1997');
    expect(ref.coverUrl).toBe('https://example.com/cover.jpg');
    expect(ref.mbid).toBeUndefined();
  });
});
