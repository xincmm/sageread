import { useRef } from "react";

export function useLatest<T>(data: T): { current: T } {
  const ref = useRef<T>(data);
  ref.current = data;
  return ref;
}
