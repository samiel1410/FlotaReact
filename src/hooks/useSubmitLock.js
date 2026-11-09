import { useCallback, useRef } from 'react';

export default function useSubmitLock() {
  const lockedRef = useRef(false);

  return useCallback((task) => {
    if (lockedRef.current) return undefined;

    lockedRef.current = true;

    let result;
    try {
      result = task();
    } catch (error) {
      lockedRef.current = false;
      throw error;
    }

    if (result && typeof result.then === 'function') {
      return result.finally(() => {
        lockedRef.current = false;
      });
    }

    lockedRef.current = false;
    return result;
  }, []);
}
