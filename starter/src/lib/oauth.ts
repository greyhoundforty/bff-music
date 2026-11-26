import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

// Scope: `atproto` is required; `transition:generic` grants generic repo
// read/write so we can putRecord / listRecords on app.bff.pick.
export const OAUTH_SCOPE = 'atproto transition:generic';

// Loopback clients (http://localhost?redirect_uri=...) need no hosted metadata.
// RFC 8252 forbids "localhost" in redirect_uri, so the callback uses 127.0.0.1.
// A production build served from a public host must set VITE_OAUTH_CLIENT_ID to
// the https URL of client-metadata.json. That value is ignored on loopback so
// `mise run serve` can sign in without a hosted client.
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function resolveClientId(origin: string, configuredClientId?: string): string {
  const page = new URL(origin);
  if (!LOOPBACK_HOSTS.has(page.hostname)) {
    if (!configuredClientId) {
      throw new Error(
        'VITE_OAUTH_CLIENT_ID is not set. Set it to the public client metadata URL before building for production.',
      );
    }
    return configuredClientId;
  }

  const redirect = new URL(origin);
  if (redirect.hostname === 'localhost') redirect.hostname = '127.0.0.1';
  redirect.pathname = '/callback';
  redirect.search = '';
  redirect.hash = '';
  return `http://localhost?redirect_uri=${encodeURIComponent(redirect.toString())}&scope=${encodeURIComponent(OAUTH_SCOPE)}`;
}

const clientId = resolveClientId(
  window.location.origin,
  import.meta.env.VITE_OAUTH_CLIENT_ID || undefined,
);

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
