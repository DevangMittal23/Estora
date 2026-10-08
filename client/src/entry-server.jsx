import React, { Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server.js';
import { Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext } from './context/AuthContext';
import { PublicLayout } from './layouts/Layouts';
import { Landing, Marketplace, PropertyDetail } from './pages/public/Properties';
import { FractionalGuide, AboutPage, Insights, InsightArticle, Calculators, CalculatorPage, CityInvestmentPage } from './pages/public/SeoPages';
import { cities } from './seo/cities';
import { ErrorPage } from './pages/shared/Shared';
export { seoResponse } from './seo/server';

export function render(pathname, entries, status = 200) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 20000 } } });
  for (const entry of entries) client.setQueryData([entry.path, entry.params, null], entry.data);
  const fallback = status === 503 ? <section className="public-section error-page"><h1>Property information is temporarily unavailable.</h1><p>Please try again shortly. Your account and existing investments are unchanged.</p><Link to="/">Return to Estora</Link></section> : <ErrorPage forbidden={status === 403} />;
  const html = renderToString(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={{ user: null, token: null, loading: false }}>
        <StaticRouter location={pathname}>
          <Suspense fallback={<div className="skeleton-stack" role="status" aria-label="Loading page"><div className="skeleton" /></div>}>
          <Routes>
            <Route element={<PublicLayout />}>
              {status === 200 ? <>
                <Route path="/" element={<Landing />} />
                <Route path="/properties" element={<Marketplace />} />
                <Route path="/properties/:id" element={<PropertyDetail />} />
                <Route path="/fractional-real-estate" element={<FractionalGuide />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/insights/:slug" element={<InsightArticle />} />
                <Route path="/calculators" element={<Calculators />} />
                <Route path="/calculators/:type" element={<CalculatorPage />} />
                {cities.map((city) => <Route key={city.slug} path={`/real-estate-investment-in-${city.slug}`} element={<CityInvestmentPage />} />)}
                <Route path="*" element={fallback} />
              </> : <Route path="*" element={fallback} />}
            </Route>
          </Routes>
          </Suspense>
          <Toaster position="top-right" toastOptions={{ style: { background: '#fffdf8', color: '#171717', borderRadius: 8 }, success: { iconTheme: { primary: '#238b6d', secondary: '#fffdf8' } }, error: { iconTheme: { primary: '#b94a48', secondary: '#fffdf8' } }, duration: 4500 }} />
        </StaticRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
  client.clear();
  return html;
}
