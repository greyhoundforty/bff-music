import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Agent } from '@atproto/api';
import type { OAuthSession } from '@atproto/oauth-client-browser';
import { getOAuthClient, OAUTH_SCOPE } from './oauth';

export type Session = {
  agent: Agent;
  did: string;
  handle: string;
} | null;

type SessionCtx = {
  session: Session;
  /** true until the initial init()/callback resolution finishes */
  loading: boolean;
  /** Set if client.init() threw during the OAuth callback — surface in UI for debugging */
  initError: string | null;
  /** Begins OAuth: resolves the handle's PDS and redirects the browser there. */
  signIn: (handle: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionCtx | undefined>(undefined);

async function toSession(oauthSession: OAuthSession): Promise<Session> {
  const agent = new Agent(oauthSession);
  const did = oauthSession.did;
  let handle: string = did;
  try {
    const prof = await agent.getProfile({ actor: did });
    handle = prof.data.handle;
  } catch {
    /* fall back to DID if profile fetch fails */
  }
  return { agent, did, handle };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  // Guard against React StrictMode double-invoking the effect: the OAuth code
  // is single-use, so a second concurrent init() call would consume it and
  // leave nothing for the first call to exchange, producing a silent no-session.
  const initStarted = useRef(false);

  // Run once on load: init() completes a pending OAuth callback AND restores an
  // existing (persisted, auto-refreshing) session if there is one.
  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;

    console.log('[BFF] OAuth init starting at', window.location.href);
    (async () => {
      try {
        const client = await getOAuthClient();
        const result = await client.init();
        console.log('[BFF] OAuth init result:', result ? 'session found' : 'no session');
        if (result?.session) {
          const sess = await toSession(result.session);
          console.log('[BFF] Session established:', sess?.handle);
          setSession(sess);
        }
      } catch (err) {
        console.error('[BFF] OAuth init failed:', err);
        setInitError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
    // No cleanup: the ref guard prevents double-runs, and cancelling a
    // mid-flight init() would consume the OAuth code without storing a session.
  }, []);

  const signIn = useCallback(async (handle: string) => {
    const client = await getOAuthClient();
    // Redirects away; only returns (throws) on failure to start.
    await client.signIn(handle.trim().replace(/^@/, ''), { scope: OAUTH_SCOPE });
  }, []);

  const signOut = useCallback(async () => {
    const client = await getOAuthClient();
    if (session) await client.revoke(session.did);
    setSession(null);
  }, [session]);

  return (
    <Ctx.Provider value={{ session, loading, initError, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession(): SessionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>');
  return ctx;
}
