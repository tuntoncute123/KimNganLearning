import { useEffect, useState } from 'react';

export type ApplicationPage = 'workspace' | 'teacher' | 'student';
function readRoute() {
  const [, page, section] = window.location.hash.split('/');
  return { page: (page === 'teacher' || page === 'student' ? page : 'workspace') as ApplicationPage, section: section || 'overview' };
}
export function useApplicationRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}
