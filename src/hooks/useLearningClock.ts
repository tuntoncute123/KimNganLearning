import { useEffect, useState } from 'react';

// Keep deadlines, ongoing lessons and the date current while the portal stays open.
export function useLearningClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  return now;
}
