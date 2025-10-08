export function sum(...args: number[]) {
  return args.reduce((acc, curr) => acc + curr, 0);
}

export function inRange(value: number, start: number, end: number) {
  return value >= start && value <= end;
}

export function requestAnimationFrameAsync() {
  return new Promise((resolve) => {
    requestAnimationFrame(resolve);
  });
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function inBrowser() {
  return typeof window !== "undefined";
}
