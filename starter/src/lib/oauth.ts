import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

// Scope: `atproto` is required; `transition:generic` grants generic repo
// read/write so we can putRecord / listRecords on app.bff.pick.
export const OAUTH_SCOPE = 'atproto transition:generic';

// In DEV, AT Protocol supports a "loopback" client: the client_id is
// http://localhost with redirect_uri + scope passed as query params — no hosted
// metadata required. In PROD, host /client-metadata.json and set
// VITE_OAUTH_CLIENT_ID to its public URL (see public/client-metadata.json).
// RFC 8252 forbids "localhost" in redirect_uri for loopback clients;
// the PDS will reject it. Replace with 127.0.0.1 so the URI is valid.
// Access the dev server at http://127.0.0.1:<port> (not localhost) so the
// callback lands on the same origin that was registered.
const devRedirectUri = window.location.origin.replace('localhost', '127.0.0.1') + '/callback';

const clientId = import.meta.env.DEV
  ? `http://localhost?redirect_uri=${encodeURIComponent(devRedirectUri)}&scope=${encodeURIComponent(OAUTH_SCOPE)}`
  : (import.meta.env.VITE_OAUTH_CLIENT_ID as string);

// Cache the promise, not the resolved value, so concurrent callers await the
// same load() call instead of spawning multiple BrowserOAuthClient instances.
let _clientPromise: Promise<BrowserOAuthClient> | null = null;

/** Lazily create the singleton OAuth client (loads/validates client metadata). */
export function getOAuthClient(): Promise<BrowserOAuthClient> {
  if (!_clientPromise) {
    _clientPromise = BrowserOAuthClient.load({
      clientId,
      // Public service used only to resolve handles → DIDs → PDS during sign-in.
      handleResolver: 'https://bsky.social',
    });
  }
  return _clientPromise;
}
