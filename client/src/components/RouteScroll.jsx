import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export function RouteScroll() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  useEffect(() => {
    if (hash) {
      let id = hash.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        /* A malformed fragment can still be a literal element id. */
      }
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    } else if (navigationType !== 'POP') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname, hash, navigationType]);
  return null;
}
