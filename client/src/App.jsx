import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { RouteScroll } from './components/RouteScroll';
import { AuthProvider } from './context/AuthContext';
import { PublicLayout, DashboardLayout } from './layouts/Layouts';
import { ProtectedRoute, RoleRoute, BrokerGuard } from './routes/Guards';
import {
  Landing,
  Marketplace,
  PropertyDetail,
} from './pages/public/Properties';
import { AuthPage } from './pages/public/Auth';
import { InvestorDashboard, Portfolio } from './pages/investor/Portfolio';
import { Checkout } from './pages/investor/Checkout';
import { Wallet, Ledger } from './pages/investor/Wallet';
import { KYC } from './pages/investor/KYC';
import {
  Enquiries,
  Notifications,
  Profile,
  ErrorPage,
} from './pages/shared/Shared';
import {
  BrokerDashboard,
  BrokerProperties,
  BrokerAnalytics,
} from './pages/broker/Broker';
import { Wizard } from './pages/broker/Wizard';
import {
  AdminDashboard,
  AdminProperties,
  Users,
  KYCQueue,
  Withdrawals,
  Settings,
} from './pages/admin/Admin';
import { Sale } from './pages/admin/Sale';
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RouteScroll />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/properties" element={<Marketplace />} />
            <Route path="/properties/:id" element={<PropertyDetail />} />
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
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
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
                    element={<Ledger commissionOnly />}
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
                <Route path="/admin/transactions" element={<Ledger />} />
              </Route>
            </Route>
          </Route>
        </Routes>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#0F2A4A', color: '#fff' },
            duration: 4500,
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
