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
    const renew = (showProgress = false) => {
      if (leaving || document.visibilityState !== 'visible') return;
      const leaseId = lease.current;
      if (!leaseId) return acquire();
      if (showProgress) setStatus('starting');
      queue(async () => {
        if (lease.current !== leaseId) return;
        try {
          await employerPipelineApi.acquireAtsSandbox(leaseId);
          if (lease.current === leaseId) setStatus('ready');
        } catch (err) {
          if (lease.current !== leaseId) return;
          lease.current = null;
          setStatus('error');
          setError(err);
          retryTimer = setTimeout(() => acquire(), 1500);
        }
      });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') renew(true);
    };
    const onRouteChange = () => {
      leaving = true;
      release();
    };
    acquire();
    const heartbeatTimer = setInterval(() => {
      if (lease.current) renew();
    }, 5 * 60 * 1000);
    window.addEventListener('pagehide', release);
    document.addEventListener('visibilitychange', onVisibility);
    router.events.on('routeChangeStart', onRouteChange);
    return () => {
      clearTimeout(retryTimer);
      clearInterval(heartbeatTimer);
      window.removeEventListener('pagehide', release);
      document.removeEventListener('visibilitychange', onVisibility);
      router.events.off('routeChangeStart', onRouteChange);
    };
  }, [router.events]);

  return { status, error };
}
