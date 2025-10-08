import { useEffect, useRef } from "react";

export function usePrevious<T>(state: T): T | null {
  const ref = useRef<T>(null);

  useEffect(() => {
    ref.current = state;
  }, [state]);

  return ref.current;
}
