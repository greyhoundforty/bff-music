import React from 'react';
import ReactDOM from 'react-dom/client';

// Loopback OAuth rejects "localhost" in redirect_uri, and storage is keyed by
// origin, so localhost:port and 127.0.0.1:port must not diverge. This applies
// to Vite and to the Node server.
if (window.location.hostname === 'localhost') {
  window.location.replace(window.location.href.replace('localhost', '127.0.0.1'));
}
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from './lib/session';
import App from './App';
import './styles/tokens.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 5 * 60_000 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <App />
        </SessionProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
