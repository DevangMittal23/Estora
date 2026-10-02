import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { homeFor } from '../utils';

const homePaths = new Set(['/', '/investor', '/broker', '/admin']);

export function PageBack({ publicPage = false }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  if (homePaths.has(normalizedPath)) return null;

  return (
    <div className={`page-back${publicPage ? ' public-page-back' : ''}`}>
      <button
        type="button"
        className="button secondary page-back-button"
        onClick={() => {
          // BrowserRouter initializes direct visits at index 0; history.length
          // can include other sites and must not decide whether Back is safe.
          const index = window.history.state?.idx;
          if (Number.isInteger(index) && index > 0) navigate(-1);
          else navigate(user ? homeFor(user) : '/', { replace: true });
        }}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back
      </button>
    </div>
  );
}
