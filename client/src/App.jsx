import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { RouteScroll } from './components/RouteScroll';
import { AuthProvider } from './context/AuthContext';
import { RouteSeo } from './seo/RouteSeo';
import { FractionalGuide, AboutPage, Insights, InsightArticle, Calculators, CalculatorPage, CityInvestmentPage } from './pages/public/SeoPages';
import { cities } from './seo/cities';
import { SessionLayout } from './layouts/Layouts';
import { ProtectedRoute, RoleRoute, BrokerGuard } from './routes/Guards';
import {
  Landing,
  Marketplace,
  PropertyDetail,
} from './pages/public/Properties';
import { AuthPage } from './pages/public/Auth';
const page = (load, name) => lazy(() => load().then((module) => ({ default: module[name] })));
const InvestorDashboard = page(() => import('./pages/investor/Portfolio'), 'InvestorDashboard');
const Portfolio = page(() => import('./pages/investor/Portfolio'), 'Portfolio');
const Checkout = page(() => import('./pages/investor/Checkout'), 'Checkout');
const Wallet = page(() => import('./pages/investor/Wallet'), 'Wallet');
const Ledger = page(() => import('./pages/investor/Wallet'), 'Ledger');
const KYC = page(() => import('./pages/investor/KYC'), 'KYC');
const Enquiries = page(() => import('./pages/shared/Shared'), 'Enquiries');
const Notifications = page(() => import('./pages/shared/Shared'), 'Notifications');
const Profile = page(() => import('./pages/shared/Shared'), 'Profile');
const ErrorPage = page(() => import('./pages/shared/Shared'), 'ErrorPage');
const BrokerDashboard = page(() => import('./pages/broker/Broker'), 'BrokerDashboard');
const BrokerProperties = page(() => import('./pages/broker/Broker'), 'BrokerProperties');
const BrokerAnalytics = page(() => import('./pages/broker/Broker'), 'BrokerAnalytics');
const Wizard = page(() => import('./pages/broker/Wizard'), 'Wizard');
const AdminDashboard = page(() => import('./pages/admin/Admin'), 'AdminDashboard');
const AdminProperties = page(() => import('./pages/admin/Admin'), 'AdminProperties');
const Users = page(() => import('./pages/admin/Admin'), 'Users');
const KYCQueue = page(() => import('./pages/admin/Admin'), 'KYCQueue');
const Withdrawals = page(() => import('./pages/admin/Admin'), 'Withdrawals');
const Settings = page(() => import('./pages/admin/Admin'), 'Settings');
const Sale = page(() => import('./pages/admin/Sale'), 'Sale');
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RouteScroll />
        <RouteSeo />
        <Suspense fallback={<div className="skeleton-stack" role="status" aria-label="Loading page"><div className="skeleton" /></div>}>
        <Routes>
          <Route element={<SessionLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/properties" element={<Marketplace />} />
            <Route path="/properties/:id" element={<PropertyDetail />} />
            <Route path="/fractional-real-estate" element={<FractionalGuide />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/insights/:slug" element={<InsightArticle />} />
            <Route path="/calculators" element={<Calculators />} />
            <Route path="/calculators/real-estate-roi" element={<CalculatorPage />} />
            <Route path="/calculators/rental-yield" element={<CalculatorPage />} />
            {cities.map((city) => <Route key={city.slug} path={`/real-estate-investment-in-${city.slug}`} element={<CityInvestmentPage />} />)}
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage mode="signup" />} />
            <Route
              path="/forgot-password"
              element={<AuthPage mode="forgot" />}
            />
            <Route path="/reset/:token" element={<AuthPage mode="reset" />} />
            <Route
              path="/reset-password/:token"
              element={<AuthPage mode="reset" />}
            />
            <Route path="/forbidden" element={<ErrorPage forbidden />} />
            <Route path="*" element={<ErrorPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route element={<RoleRoute role="INVESTOR" />}>
                <Route path="/investor" element={<InvestorDashboard />} />
                <Route path="/investor/portfolio" element={<Portfolio />} />
                <Route path="/investor/invest/:id" element={<Checkout />} />
                <Route path="/investor/wallet" element={<Wallet />} />
                <Route path="/investor/kyc" element={<KYC />} />
                <Route path="/investor/enquiries" element={<Enquiries />} />
              </Route>
              <Route element={<RoleRoute role="BROKER" />}>
                <Route element={<BrokerGuard />}>
                  <Route path="/broker" element={<BrokerDashboard />} />
                  <Route
                    path="/broker/properties"
                    element={<BrokerProperties />}
                  />
                  <Route path="/broker/properties/new" element={<Wizard />} />
                  <Route
                    path="/broker/properties/:id/edit"
                    element={<Wizard />}
                  />
                  <Route
                    path="/broker/properties/:id"
                    element={<BrokerAnalytics />}
                  />
                  <Route path="/broker/enquiries" element={<Enquiries />} />
                  <Route
                    path="/broker/transactions"
                    element={<Ledger commissionOnly standalone />}
                  />
                </Route>
              </Route>
              <Route element={<RoleRoute role="ADMIN" />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/properties" element={<AdminProperties />} />
                <Route
                  path="/admin/properties/new"
                  element={<Wizard admin />}
                />
                <Route
                  path="/admin/properties/:id/edit"
                  element={<Wizard admin />}
                />
                <Route path="/admin/properties/:id/sell" element={<Sale />} />
                <Route path="/admin/users" element={<Users />} />
                <Route path="/admin/enquiries" element={<Enquiries />} />
                <Route path="/admin/kyc" element={<KYCQueue />} />
                <Route path="/admin/withdrawals" element={<Withdrawals />} />
                <Route path="/admin/settings" element={<Settings />} />
                <Route
                  path="/admin/transactions"
                  element={<Ledger standalone />}
                />
              </Route>
            </Route>
          </Route>
        </Routes>
        </Suspense>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#fffdf8', color: '#171717', borderRadius: 8 },
            success: { iconTheme: { primary: '#238b6d', secondary: '#fffdf8' } },
            error: { iconTheme: { primary: '#b94a48', secondary: '#fffdf8' } },
            duration: 4500,
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
