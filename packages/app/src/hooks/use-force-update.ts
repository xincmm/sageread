import { useState } from "react";

export const useForceUpdate = () => {
  const [, setState] = useState(0);
  return () => setState((prev) => prev + 1);
};
