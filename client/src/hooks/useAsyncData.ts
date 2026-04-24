import { startTransition, useEffect, useState, type DependencyList } from "react";

export function useAsyncData<T>(loader: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    startTransition(() => {
      setLoading(true);
      setError(null);
    });

    loader()
      .then((result) => {
        if (mounted) {
          setData(result);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, deps);

  return { data, loading, error, setData, setError, setLoading };
}
