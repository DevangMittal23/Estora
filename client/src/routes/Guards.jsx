import React from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Empty } from '../components/ui';
export function ProtectedRoute() {
  const { token, user, loading, error, refresh } = useAuth();
  const location = useLocation();
  if (!token)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (loading)
    return (
      <div
        className="skeleton-stack"
        role="status"
        aria-label="Loading profile"
      >
        <div className="skeleton" />
      </div>
    );
  if (error || !user)
    return (
      <main className="public-section">
        <div className="error-state">
          <h2>We couldn’t load your profile</h2>
          <p>{error}</p>
          <Button onClick={refresh}>Try again</Button>
        </div>
      </main>
    );
  return <Outlet />;
}
export function RoleRoute({ role }) {
  const { user } = useAuth();
  return user?.role === role ? (
    <Outlet />
  ) : (
    <Navigate to="/forbidden" replace />
  );
}
export function BrokerGuard() {
  const { user, refresh } = useAuth();
  return user.brokerApproved ? (
    <Outlet />
  ) : (
    <Empty
      title="Your broker account is under review"
      description="An administrator must approve your account before you can list properties or access broker activity."
      action={
        <>
          <Button onClick={refresh}>Check approval status</Button>
          <Link className="text-link" to="/profile">
            Review your profile
          </Link>
        </>
      }
    />
  );
}
