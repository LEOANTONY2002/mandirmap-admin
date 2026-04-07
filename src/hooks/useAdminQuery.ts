import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../state/auth';

export function useAdminQuery<T>(path: string, deps: unknown[] = []) {
  const { token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<T>(path, token)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [path, token, refreshKey, ...deps]);

  return {
    data,
    loading,
    error,
    refresh: () => setRefreshKey((current) => current + 1),
    setData,
  };
}
