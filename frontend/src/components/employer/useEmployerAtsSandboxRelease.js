'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { employerPipelineApi } from '@/services/employerApi';

/** Hold one sandbox lease while this page is visible. */
export default function useEmployerAtsSandboxRelease(onPause) {
  const router = useRouter();
  const [status, setStatus] = useState('starting');
  const [error, setError] = useState(null);
  const chain = useRef(Promise.resolve());
  const lease = useRef(null);
  const onPauseRef = useRef(onPause);
  onPauseRef.current = onPause;

  useEffect(() => {
    let leaving = false;
    let retryTimer;
    const queue = (task) => {
      chain.current = chain.current.catch(() => {}).then(task);
    };
    const acquire = (attempt = 0) => {
      if (leaving || document.visibilityState === 'hidden' || lease.current) return;
      const leaseId = crypto.randomUUID();
      lease.current = leaseId;
      setStatus('starting');
      setError(null);
      queue(async () => {
        try {
          await employerPipelineApi.acquireAtsSandbox(leaseId);
          if (lease.current === leaseId) setStatus('ready');
        } catch (err) {
          if (lease.current !== leaseId) return;
          lease.current = null;
          setStatus('error');
          setError(err);
          retryTimer = setTimeout(
            () => acquire(Math.min(attempt + 1, 5)),
            Math.min(1500 * (attempt + 1), 10000),
          );
        }
      });
    };
    const release = () => {
      clearTimeout(retryTimer);
      if (!lease.current) return;
      const leaseId = lease.current;
      lease.current = null;
      setStatus('paused');
      onPauseRef.current?.();
      queue(() => employerPipelineApi.releaseAtsSandboxKeepalive(leaseId));
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') release();
      else acquire();
    };
    const onRouteChange = () => {
      leaving = true;
      release();
    };
    acquire();
    window.addEventListener('pagehide', release);
    document.addEventListener('visibilitychange', onVisibility);
    router.events.on('routeChangeStart', onRouteChange);
    return () => {
      clearTimeout(retryTimer);
      window.removeEventListener('pagehide', release);
      document.removeEventListener('visibilitychange', onVisibility);
      router.events.off('routeChangeStart', onRouteChange);
    };
  }, [router.events]);

  return { status, error };
}
