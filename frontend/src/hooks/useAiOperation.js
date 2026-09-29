import { useCallback, useRef, useState } from 'react';
import { API_URL } from '@/config/api';
import { getAccessToken } from '@/lib/apiClient';

/** Keep the server request alive while Cancel stops its sandbox and settles usage. */
export function useAiOperation() {
  const current = useRef(null);
  const [active, setActive] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const run = useCallback(async (work) => {
    if (current.current) throw new Error('Wait for the current operation to finish stopping.');
    const operation = { id: crypto.randomUUID() };
    current.current = operation;
    setActive(true);
    setCancelError('');
    try { return await work({ 'X-AI-Operation-Id': operation.id }); }
    finally {
      if (current.current === operation) {
        current.current = null;
        setActive(false);
      }
    }
  }, []);
  const cancel = useCallback(async () => {
    const operation = current.current;
    if (!operation || operation.cancelling) return;
    operation.cancelling = true;
    setCancelling(true);
    setCancelError('');
    try {
      const token = await getAccessToken();
      const request = async (suffix, method) => {
        const response = await fetch(`${API_URL}/api/ai-operations/${operation.id}${suffix}`, {
          method, headers: { Authorization: `Bearer ${token}` },
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || 'Could not cancel. Please try again.');
        return body;
      };
      let result = await request('/cancel', 'POST');
      const deadline = Date.now() + 90000;
      while (['running', 'cancelling', 'pending'].includes(result.status)) {
        if (Date.now() > deadline) throw new Error('Cancellation is still finishing. Please check again shortly.');
        await new Promise(resolve => setTimeout(resolve, 500));
        result = await request('', 'GET');
      }
      return result;
    } catch (error) {
      setCancelError(error.message || 'Could not cancel. Please try again.');
      return null;
    } finally {
      operation.cancelling = false;
      setCancelling(false);
    }
  }, []);
  return { run, cancel, active, cancelling, cancelError };
}
