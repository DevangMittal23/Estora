import React, { useEffect, useRef, useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useLocation,
} from 'react-router-dom';
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
import { PageBack } from '../components/PageBack';
import { useData } from '../api';
import { compactMoney, homeFor, label } from '../utils';
import { ProtectedRoute } from '../routes/Guards';
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
    ['Listing enquiries', '/admin/enquiries', MessageSquare],
    ['KYC review', '/admin/kyc', ShieldCheck],
    ['Withdrawals', '/admin/withdrawals', Wallet],
    ['Platform settings', '/admin/settings', Settings],
    ['All transactions', '/admin/transactions', ChartPie],
  ],
};
export function Logo() {
  const { user } = useAuth();
  return (
    <Link to={user ? homeFor(user) : '/'} className="logo">
      <span className="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 35V14L16 4L28 14V35M9 35V17L16 11L23 17V35M16 11V35M4 35H28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" />
        </svg>
      </span>ESTORA
    </Link>
  );
}
export function Footer() {
  return (
    <footer className="public-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Logo />
          <span className="footer-brand-descriptor">
            Premium Fractional Real Estate Investment Platform
          </span>
          <p>
            Real estate ownership,
            <br />
            one considered share at a time.
          </p>
        </div>
        <div>
          <h2>Explore ESTORA</h2>
          <Link to="/properties">Property marketplace</Link>
          <a href="/#how-it-works">How fractional ownership works</a>
          <a href="/#faq">Questions & answers</a>
        </div>
        <div>
          <h2>Your next step</h2>
          <Link to="/signup">Become an investor</Link>
          <Link to="/signup?role=broker">Join as a broker</Link>
          <Link to="/login">Log in to your account</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <p>
          This is an academic project. No real money or securities are involved.
          Use dummy identity documents only.
        </p>
        <span>ESTORA · Fractional real estate</span>
      </div>
    </footer>
  );
}
// A signed-in session keeps the same workspace across public and role routes.
export function SessionLayout() {
  const { token, user } = useAuth();
  // Reuse profile loading/retry handling so refresh never flashes visitor nav.
  if (token && !user) return <ProtectedRoute />;
  return user ? <DashboardLayout /> : <PublicLayout />;
}
export function PublicLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const authPage = /^\/(login|signup|forgot-password|reset-password)(\/|$)/.test(location.pathname);
  const landingPage = location.pathname === '/';
  const menuButton = useRef(null);
  useEffect(
    () => setOpen(false),
    [location.pathname, location.search, location.hash]
  );
  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <nav className={`public-nav${authPage ? ' auth-nav' : landingPage ? ' landing-nav' : ''}`} aria-label="Main navigation">
        <Logo />
        <div
          id="public-navigation"
          className={`public-nav-links ${open ? 'is-open' : ''}`}
        >
          <NavLink to="/properties">Discover properties</NavLink>
          <a href="/#how-it-works" onClick={() => setOpen(false)}>
            How it works
          </a>
          <a href="/#faq" onClick={() => setOpen(false)}>
            Why ESTORA
          </a>
          {!user && (
            <Link className="mobile-login" to="/login">
              Log in
            </Link>
          )}
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
          <button
            ref={menuButton}
            className="icon-button public-menu-button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="public-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>
      <main
        id="main-content"
        tabIndex={-1}
        className={authPage ? 'auth-layout' : landingPage ? 'landing-layout' : undefined}
      >
        <PageBack publicPage />
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
export function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const sidebarRef = useRef(null);
  const menuRef = useRef(null);
  const [mobile, setMobile] = useState(
    () => window.matchMedia('(max-width: 768px)').matches
  );
  useEffect(
    () => setOpen(false),
    [location.pathname, location.search, location.hash]
  );
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!open || !mobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebarRef.current?.querySelector('button')?.focus();
    const listener = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menuRef.current?.focus();
      }
      if (event.key === 'Tab') {
        const nodes = sidebarRef.current?.querySelectorAll(
          'a[href],button:not(:disabled)'
        );
        const first = nodes?.[0],
          last = nodes?.[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', listener);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', listener);
    };
  }, [open, mobile]);
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
        ref={sidebarRef}
        id="workspace-navigation"
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
        <nav aria-label={`${label(user.role)} navigation`}>
          {navigation[user.role].map(([text, to, Icon]) => (
            <NavLink key={to} to={to} end onClick={() => setOpen(false)}>
              <Icon size={19} />
              {text}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/properties" onClick={() => setOpen(false)}>
            <Building2 size={19} />
            Explore marketplace
            <ArrowUpRight size={16} />
          </NavLink>
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
            ref={menuRef}
            aria-expanded={open}
            aria-controls="workspace-navigation"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <span className="topbar-title">
            <strong>{label(user.role)} workspace</strong>
            <span> / </span> {user.name}
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
          <PageBack />
          <Outlet />
        </main>
        <footer className="dashboard-footer">
          This is an academic project. No real money or securities are involved.
        </footer>
      </div>
    </div>
  );
}
