import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./index.js";

/**
 * Fetch helper with loading / error / refresh, plus an optional refetch
 * interval. Returns the parsed payload and a `reload` callback.
 */
export function useApi(loader, deps = [], { interval } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const result = await loaderRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!interval) return undefined;
    const id = setInterval(() => run({ quiet: true }), interval);
    return () => clearInterval(id);
  }, [interval, run]);

  return { data, loading, error, reload: run, setData };
}

/** Dashboard / meta polling helpers. */
export const useDashboard = () => useApi(() => api.dashboard(), []);
export const useMeta = () => useApi(() => api.meta(), []);
