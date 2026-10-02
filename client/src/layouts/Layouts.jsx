import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Building2,
  LayoutDashboard,
  ChartPie,
  Wallet,
  ShieldCheck,
  MessageSquare,
  Users,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Plus,
  ArrowUpRight,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../api';
import { compactMoney, homeFor, label } from '../utils';
const navigation = {
  INVESTOR: [
    ['Overview', '/investor', LayoutDashboard],
    ['My portfolio', '/investor/portfolio', ChartPie],
    ['Wallet & transactions', '/investor/wallet', Wallet],
    ['Identity verification', '/investor/kyc', ShieldCheck],
    ['Enquiries', '/investor/enquiries', MessageSquare],
  ],
  BROKER: [
    ['Overview', '/broker', LayoutDashboard],
    ['My properties', '/broker/properties', Building2],
    ['Create listing', '/broker/properties/new', Plus],
    ['Enquiries', '/broker/enquiries', MessageSquare],
    ['Commission history', '/broker/transactions', Wallet],
  ],
  ADMIN: [
    ['Overview', '/admin', LayoutDashboard],
    ['Properties', '/admin/properties', Building2],
    ['User management', '/admin/users', Users],
    ['KYC review', '/admin/kyc', ShieldCheck],
    ['Withdrawals', '/admin/withdrawals', Wallet],
    ['Platform settings', '/admin/settings', Settings],
    ['All transactions', '/admin/transactions', ChartPie],
  ],
};
export function Logo() {
  return (
    <Link to="/" className="logo">
      <span className="logo-mark">E</span>ESTORA
      <span className="logo-dot">.</span>
    </Link>
  );
}
export function Footer() {
  return (
    <footer>
      <Logo />
      <p>
        This is an academic project. No real money or securities are involved.
      </p>
      <span>One property. Many owners.</span>
    </footer>
  );
}
export function PublicLayout() {
  const { user } = useAuth();
  return (
    <>
      <nav className="public-nav">
        <Logo />
        <div className="public-nav-links">
          <NavLink to="/properties">Discover properties</NavLink>
          <a href="/#how-it-works">How it works</a>
        </div>
        <div className="actions">
          {user ? (
            <Link className="button primary" to={homeFor(user)}>
              My dashboard <ArrowUpRight size={15} />
            </Link>
          ) : (
            <>
              <Link className="login-link" to="/login">
                Log in
              </Link>
              <Link className="button primary" to="/signup">
                Get started <ArrowUpRight size={15} />
              </Link>
            </>
          )}
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
export function DashboardLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(
    () => window.matchMedia('(max-width: 768px)').matches
  );
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const navigate = useNavigate();
  const notifications = useData(
    '/notifications',
    { limit: 1 },
    { refetchInterval: 30000 }
  );
  const wallet = useData('/wallet', {}, { enabled: user?.role === 'INVESTOR' });
  return (
    <div className="dashboard-shell">
      {open && (
        <div className="sidebar-backdrop" onClick={() => setOpen(false)} />
      )}
      <aside
        className={`sidebar ${open ? 'is-open' : ''}`}
        inert={mobile && !open ? '' : undefined}
        aria-hidden={mobile && !open ? true : undefined}
      >
        <div className="sidebar-logo">
          <Logo />
          <button
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <span className="sidebar-caption">{label(user.role)} workspace</span>
        <nav>
          {navigation[user.role].map(([text, to, Icon]) => (
            <NavLink key={to} to={to} end onClick={() => setOpen(false)}>
              <Icon size={19} />
              {text}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/properties">
            <Building2 size={19} />
            Explore marketplace
            <ArrowUpRight size={16} />
          </Link>
          <Link to="/notifications">
            <Bell size={19} />
            Notifications
          </Link>
          <Link to="/profile">
            <UserRound size={19} />
            My profile
          </Link>
          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            <LogOut size={19} />
            Log out
          </button>
          <p>
            One property.
            <br />
            <strong>Many possibilities.</strong>
          </p>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="topbar">
          <button
            className="icon-button mobile-only"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <span className="topbar-title">
            Your real estate, in perspective.
          </span>
          <div className="actions">
            {user.role === 'INVESTOR' && (
              <Link to="/investor/wallet" className="topbar-wallet">
                <Wallet size={17} />
                {wallet.data
                  ? compactMoney(wallet.data.walletBalance)
                  : 'Wallet'}
              </Link>
            )}
            <Link
              className="notification-button"
              aria-label={`${notifications.data?.unreadCount || 0} unread notifications`}
              to="/notifications"
            >
              <Bell size={20} />
              {notifications.data?.unreadCount > 0 && (
                <b>{notifications.data.unreadCount}</b>
              )}
            </Link>
            <Link to="/profile" className="avatar" aria-label="My profile">
              {user.name.slice(0, 2).toUpperCase()}
            </Link>
          </div>
        </header>
        <main className="workspace">
          <Outlet />
        </main>
        <footer className="dashboard-footer">
          This is an academic project. No real money or securities are involved.
        </footer>
      </div>
    </div>
  );
}
