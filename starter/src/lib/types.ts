// TypeScript types mirroring lexicons/app/bff/pick.json.
// Keep in sync with the lexicon (or generate with @atproto/lex-cli gen-api).

export const PICK_COLLECTION = 'app.bff.pick' as const;

export type PickKind = 'best' | 'favorite' | 'first';

/** External reference to a music artist (artists are not atproto records). */
export interface ArtistRef {
  name: string;
  /** MusicBrainz artist MBID (UUID), if known. */
  mbid?: string;
}

/** External reference to an album / release group. */
export interface AlbumRef {
  title: string;
  /** MusicBrainz release-group MBID (UUID), if known. */
  mbid?: string;
  year?: string;
  /** Cover art URL (e.g. Cover Art Archive). */
  coverUrl?: string;
}

/** A single Best / Favorite / First pick record. */
export interface AppBffPick {
  $type?: typeof PICK_COLLECTION;
  kind: PickKind;
  artist: ArtistRef;
  album: AlbumRef;
  /** Optional one-line reason shown in the social feed. */
  note?: string;
  createdAt: string;
}

/** A pick as returned from listRecords (carries its at:// uri). */
export interface PickRecord {
  uri: string;
  cid?: string;
  value: AppBffPick;
}
