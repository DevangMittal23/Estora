import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { WebAnalytics } from './components/WebAnalytics';
import { getToken } from './session';
import './index.css';
import './premium.css';
import './seo-pages.css';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 20000, refetchOnWindowFocus: true },
  },
});
let publicState;
try {
  publicState = JSON.parse(document.getElementById('estora-public-state')?.textContent || 'null');
} catch { /* Static SPA deployments have no server-rendered state. */ }
if (publicState) window.__ESTORA_PUBLIC__ = publicState;
if (publicState?.pathname === window.location.pathname) {
  if (!getToken()) for (const entry of publicState.entries || [])
    queryClient.setQueryData([entry.path, entry.params, null], entry.data);
}
function PublicRefresh() {
  React.useEffect(() => {
    const details = publicState?.entries?.filter((entry) => /^\/properties\/[a-f\d]{24}$/i.test(entry.path)) || [];
    if (!details.length || getToken()) return;
    // Complete hydration using the same safe snapshot before requesting the
    // interactive API representation (including permission-checked documents).
    const timer = window.setTimeout(() => {
      if (!getToken()) for (const entry of details) queryClient.invalidateQueries({ queryKey: [entry.path, entry.params, null], exact: true });
    }, 750);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
const application = (
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <PublicRefresh />
      <WebAnalytics />
    </QueryClientProvider>
  </React.StrictMode>
);
const root = document.getElementById('root');
if (publicState?.rendered && publicState.status === 200 && !getToken())
  ReactDOM.hydrateRoot(root, application);
else ReactDOM.createRoot(root).render(application);
