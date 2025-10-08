import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface ReasoningTimes {
  [reasoningIndex: number]: number;
}

export interface UseReasoningTimerOptions {
  messageId?: string;
  existingTimes?: ReasoningTimes;
  onTimesChange?: (messageId: string, times: ReasoningTimes) => void;
}

export interface UseReasoningTimerReturn {
  reasoningTimes: ReasoningTimes;
  getDisplayTime: (reasoningIndex: number, isCurrentlyStreaming: boolean) => number | undefined;
  onReasoningStreamingChange: (reasoningIndex: number, isStreaming: boolean) => void;
  getCurrentTimes: () => ReasoningTimes;
}

export function useReasoningTimer(options: UseReasoningTimerOptions = {}): UseReasoningTimerReturn {
  const { messageId, existingTimes = {}, onTimesChange } = options;

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const stableExistingTimes = useMemo(() => existingTimes, [JSON.stringify(existingTimes)]);

  const [reasoningTimes, setReasoningTimes] = useState<ReasoningTimes>(stableExistingTimes);

  const startTimesRef = useRef<{ [reasoningIndex: number]: number }>({});
  const timersRef = useRef<{ [reasoningIndex: number]: NodeJS.Timeout }>({});
  const currentTimesRef = useRef<{ [reasoningIndex: number]: number }>({});

  const prevStreamingStateRef = useRef<{ [reasoningIndex: number]: boolean }>({});

  const clearAllTimers = useCallback(() => {
    Object.values(timersRef.current).forEach((timer) => {
      if (timer) clearInterval(timer);
    });
    timersRef.current = {};
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    clearAllTimers();
    startTimesRef.current = {};
    currentTimesRef.current = {};
    prevStreamingStateRef.current = {};
    setReasoningTimes(stableExistingTimes);
  }, [messageId, stableExistingTimes, clearAllTimers]);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const onReasoningStreamingChange = useCallback(
    (reasoningIndex: number, isStreaming: boolean) => {
      const prevState = prevStreamingStateRef.current[reasoningIndex] || false;
      const stateChanged = prevState !== isStreaming;

      if (stateChanged) {
        if (isStreaming) {
          const startTime = Date.now();
          startTimesRef.current[reasoningIndex] = startTime;
          currentTimesRef.current[reasoningIndex] = 0;

          const timer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            currentTimesRef.current[reasoningIndex] = elapsed;
          }, 100);

          timersRef.current[reasoningIndex] = timer;
        } else {
          const timer = timersRef.current[reasoningIndex];
          if (timer) {
            clearInterval(timer);
            delete timersRef.current[reasoningIndex];
          }

          const startTime = startTimesRef.current[reasoningIndex];
          if (startTime) {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const finalTime = elapsed === 0 ? 1 : elapsed;

            setReasoningTimes((prev) => {
              const newTimes = {
                ...prev,
                [reasoningIndex]: finalTime,
              };

              if (messageId && onTimesChange) {
                onTimesChange(messageId, newTimes);
              }

              return newTimes;
            });

            currentTimesRef.current[reasoningIndex] = finalTime;
            delete startTimesRef.current[reasoningIndex];
          }
        }
      }

      prevStreamingStateRef.current[reasoningIndex] = isStreaming;
    },
    [messageId, onTimesChange],
  );

  const getDisplayTime = useCallback(
    (reasoningIndex: number, isCurrentlyStreaming: boolean): number | undefined => {
      if (isCurrentlyStreaming) {
        const currentTime = currentTimesRef.current[reasoningIndex] || 0;
        return Math.max(1, currentTime);
      }
      const finalTime = reasoningTimes[reasoningIndex];

      if (finalTime !== undefined) {
        return finalTime === 0 ? 1 : finalTime;
      }

      return 1;
    },
    [reasoningTimes],
  );

  const getCurrentTimes = useCallback((): ReasoningTimes => {
    const result = { ...reasoningTimes };

    Object.entries(currentTimesRef.current).forEach(([index, time]) => {
      const reasoningIndex = Number.parseInt(index);
      if (time > 0) {
        result[reasoningIndex] = time;
      }
    });

    return result;
  }, [reasoningTimes]);

  return {
    reasoningTimes,
    getDisplayTime,
    getCurrentTimes,
    onReasoningStreamingChange,
  };
}
