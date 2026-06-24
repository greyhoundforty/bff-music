import { type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './lib/session';
import Callback from './routes/Callback';
import Login from './routes/Login';
import Discover from './routes/Discover';
import Artist from './routes/Artist';
import Profile from './routes/Profile';

// ── Auth guards ───────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { session, loading } = useSession();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// ── App shell ─────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route
        path="/login"
        element={<RedirectIfAuthed><Login /></RedirectIfAuthed>}
      />
      {/* OAuth redirect lands here (SessionProvider.init() resolves the code) */}
      <Route path="/callback" element={<Callback />} />

      {/* Protected screens — build to match design/Best Favorite First Hi-Fi.dc.html */}
      <Route path="/"               element={<RequireAuth><Discover /></RequireAuth>} />
      <Route path="/artist/:artistKey" element={<RequireAuth><Artist /></RequireAuth>} />
      <Route path="/you"            element={<RequireAuth><Profile /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ── Shared loading screen ─────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--page-bg)',
      fontFamily: 'var(--font-ui)', color: 'var(--faint)', fontSize: 15,
    }}>
      Loading…
    </div>
  );
}
