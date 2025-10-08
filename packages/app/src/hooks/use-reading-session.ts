import {
  calculateSessionDuration,
  completeReadingSession,
  createReadingSession,
  getActiveReadingSession,
  updateReadingSession,
} from "@/services/reading-session-service";
import { type ActivityConfig, type ReadingSession, SessionState, type SessionStats } from "@/types/reading-session";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_CONFIG: ActivityConfig = {
  pauseThreshold: 20 * 1000,
  autoEndThreshold: 1 * 60 * 1000,
  saveInterval: 5 * 1000,
};

const IFRAME_ACTIVITY_EVENTS = [
  "iframe-mousedown",
  "iframe-mousemove",
  "iframe-keydown",
  "iframe-wheel",
  "iframe-single-click",
  "iframe-double-click",
] as const;

// 应用级别的用户活动事件（不包括移动端 touch 事件）
const APP_ACTIVITY_EVENTS = ["mousedown", "mousemove", "click", "keydown", "keyup", "wheel"] as const;

export interface UseReadingSessionConfig extends Partial<ActivityConfig> {
  isVisible?: boolean;
}

export const useReadingSession = (bookId: string, config: UseReadingSessionConfig = {}) => {
  // ==================== 配置和依赖 ====================
  const fullConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  const isVisible = config.isVisible ?? true;

  // ==================== 状态管理 ====================
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAutoEnded, setIsAutoEnded] = useState(false);

  // ==================== 引用管理 ====================
  const currentSessionRef = useRef<ReadingSession | null>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // ==================== 核心业务逻辑 ====================

  // 初始化会话
  const initializeSession = useCallback(async () => {
    try {
      let session = await getActiveReadingSession(bookId);

      if (!session) {
        session = await createReadingSession({
          bookId,
          startedAt: Date.now(),
        });
      }

      currentSessionRef.current = session;

      const initialStats = {
        totalActiveTime: session.durationSeconds * 1000,
        sessionStartTime: session.startedAt,
        lastActivityTime: Date.now(),
        currentState: SessionState.ACTIVE,
      };

      setSessionStats(initialStats);
      setIsInitialized(true);
    } catch (error) {
      console.error("初始化会话失败:", error);
    }
  }, [bookId]);

  // 保存会话数据
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const saveSessionData = useCallback(async () => {
    if (!currentSessionRef.current || !sessionStats) return;

    try {
      const totalSeconds = calculateSessionDuration(
        currentSessionRef.current.startedAt,
        undefined,
        sessionStats.totalActiveTime,
      );

      await updateReadingSession(currentSessionRef.current.id, {
        durationSeconds: totalSeconds,
      });
    } catch (error) {
      console.error("保存会话数据失败:", error);
    }
  }, [currentSessionRef, sessionStats]);

  // 结束会话
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const endSession = useCallback(async () => {
    if (!currentSessionRef.current || !sessionStats) return;

    try {
      await completeReadingSession(currentSessionRef.current.id);
      setSessionStats((prev) => (prev ? { ...prev, currentState: SessionState.STOPPED } : null));
    } catch (error) {
      console.error("结束会话失败:", error);
    }
  }, [currentSessionRef, sessionStats]);

  // ==================== 定时器管理 ====================

  // 启动暂停定时器
  const startPauseTimer = useCallback(() => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }

    pauseTimeoutRef.current = setTimeout(() => {
      setSessionStats((prev) => {
        if (!prev) return null;
        const now = Date.now();
        const timeDiff = now - prev.lastActivityTime;
        return {
          ...prev,
          totalActiveTime:
            prev.currentState === SessionState.ACTIVE ? prev.totalActiveTime + timeDiff : prev.totalActiveTime,
          lastActivityTime: now,
          currentState: SessionState.PAUSED,
        };
      });
    }, fullConfig.pauseThreshold);
  }, [fullConfig.pauseThreshold]);

  // 启动自动结束定时器
  const startAutoEndTimer = useCallback(() => {
    if (autoEndTimeoutRef.current) {
      clearTimeout(autoEndTimeoutRef.current);
    }

    autoEndTimeoutRef.current = setTimeout(async () => {
      if (!currentSessionRef.current || !sessionStats) return;

      try {
        await completeReadingSession(currentSessionRef.current.id);
        setSessionStats((prev) => (prev ? { ...prev, currentState: SessionState.STOPPED } : null));
        setIsInitialized(false);
        setIsAutoEnded(true);
        console.log("自动结束会话成功，autoEndThreshold 后，自动结束会话");
      } catch (error) {
        console.error("自动结束会话失败，autoEndThreshold 后，自动结束会话:", error);
      }
    }, fullConfig.autoEndThreshold);
  }, [fullConfig.autoEndThreshold, sessionStats]);

  // ==================== 事件处理函数 ====================

  // 处理用户活动
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // 如果会话是自动结束的，重新初始化
    if (isAutoEnded) {
      // 清理当前状态
      setIsAutoEnded(false);
      currentSessionRef.current = null;
      setSessionStats(null);

      // 清理定时器
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
      if (autoEndTimeoutRef.current) {
        clearTimeout(autoEndTimeoutRef.current);
        autoEndTimeoutRef.current = null;
      }

      // 使用 setTimeout 确保状态清理后再初始化
      setTimeout(async () => {
        await initializeSession();
        startPauseTimer();
        startAutoEndTimer();
      }, 0);

      return;
    }

    if (!currentSessionRef.current || !isInitialized) {
      setIsInitialized(false);
      return;
    }

    setSessionStats((prev) => {
      if (!prev) return null;

      const timeDiff = now - prev.lastActivityTime;
      let newTotalActiveTime = prev.totalActiveTime;

      if (prev.currentState === SessionState.ACTIVE) {
        newTotalActiveTime += timeDiff;
      }
      return {
        ...prev,
        totalActiveTime: newTotalActiveTime,
        lastActivityTime: now,
        currentState: SessionState.ACTIVE,
      };
    });

    startPauseTimer();
    startAutoEndTimer();
  }, [startPauseTimer, startAutoEndTimer, isInitialized, isAutoEnded, initializeSession]);

  // iframe 消息处理
  const handleIframeMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data?.bookId !== bookId) return;

      if (IFRAME_ACTIVITY_EVENTS.includes(event.data?.type)) {
        handleUserActivity();
      }
    },
    [bookId, handleUserActivity],
  );

  const handleAppActivity = useCallback(() => {
    handleUserActivity();
  }, [handleUserActivity]);

  const handleWindowFocus = useCallback(() => {
    handleUserActivity();
  }, [handleUserActivity]);

  const handleWindowBlur = useCallback(() => {
    setSessionStats((prev) => {
      if (!prev) return null;
      const now = Date.now();
      const timeDiff = now - prev.lastActivityTime;

      return {
        ...prev,
        totalActiveTime:
          prev.currentState === SessionState.ACTIVE ? prev.totalActiveTime + timeDiff : prev.totalActiveTime,
        lastActivityTime: now,
        currentState: SessionState.PAUSED,
      };
    });

    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
    }
  }, []);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      handleWindowBlur();
    } else {
      handleWindowFocus();
    }
  }, [handleWindowFocus, handleWindowBlur]);

  // ==================== 生命周期效果 ====================

  // 监听 tab 可见性变化
  const prevIsVisibleRef = useRef(isVisible);
  const sessionEndTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 只在 isVisible 真正变化时才触发
    if (prevIsVisibleRef.current === isVisible) return;
    prevIsVisibleRef.current = isVisible;

    if (!isInitialized) return;

    if (!isVisible) {
      // Tab 不可见时，暂停计时（类似 window blur）
      setSessionStats((prev) => {
        if (!prev) return null;
        const now = Date.now();
        const timeDiff = now - prev.lastActivityTime;

        return {
          ...prev,
          totalActiveTime:
            prev.currentState === SessionState.ACTIVE ? prev.totalActiveTime + timeDiff : prev.totalActiveTime,
          lastActivityTime: now,
          currentState: SessionState.PAUSED,
        };
      });

      // 清理暂停定时器
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }

      if (sessionEndTimerRef.current) {
        clearTimeout(sessionEndTimerRef.current);
      }
      sessionEndTimerRef.current = setTimeout(async () => {
        if (!currentSessionRef.current) return;

        try {
          await completeReadingSession(currentSessionRef.current.id);
          setSessionStats((prev) => (prev ? { ...prev, currentState: SessionState.STOPPED } : null));
          setIsInitialized(false);
          console.log("Tab 不可见超过 autoEndThreshold 后，自动结束会话");
        } catch (error) {
          console.error("自动结束会话失败:", error);
        }
      }, fullConfig.autoEndThreshold);
    } else {
      // Tab 可见时，取消结束定时器，恢复活跃状态
      if (sessionEndTimerRef.current) {
        clearTimeout(sessionEndTimerRef.current);
        sessionEndTimerRef.current = null;
      }

      // 如果会话已经被结束，重新初始化
      if (!isInitialized || sessionStats?.currentState === SessionState.STOPPED) {
        // 清理状态并重新初始化
        currentSessionRef.current = null;
        setSessionStats(null);
        setIsInitialized(false);

        setTimeout(async () => {
          await initializeSession();
          startPauseTimer();
          startAutoEndTimer();
        }, 0);
      } else {
        // 否则只是恢复活跃状态
        handleUserActivity();
      }
    }
  }, [
    isVisible,
    isInitialized,
    handleUserActivity,
    sessionStats,
    fullConfig.autoEndThreshold,
    initializeSession,
    startPauseTimer,
    startAutoEndTimer,
  ]);

  useEffect(() => {
    if (!bookId) return;

    window.addEventListener("message", handleIframeMessage);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    APP_ACTIVITY_EVENTS.forEach((eventType) => {
      document.addEventListener(eventType, handleAppActivity, { passive: true });
    });

    if (isInitialized) {
      saveIntervalRef.current = setInterval(saveSessionData, fullConfig.saveInterval);
    }

    return () => {
      window.removeEventListener("message", handleIframeMessage);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      APP_ACTIVITY_EVENTS.forEach((eventType) => {
        document.removeEventListener(eventType, handleAppActivity);
      });

      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };
  }, [
    bookId,
    isInitialized,
    handleIframeMessage,
    handleWindowFocus,
    handleWindowBlur,
    handleVisibilityChange,
    handleAppActivity,
    saveSessionData,
    fullConfig.saveInterval,
  ]);

  // 暂停定时器启动
  useEffect(() => {
    if (!isInitialized) return;
    startPauseTimer();
  }, [isInitialized, startPauseTimer]);

  // bookId 变化时的清理
  useEffect(() => {
    if (!bookId) return;

    setIsInitialized(false);
    setIsAutoEnded(false);
    currentSessionRef.current = null;
    setSessionStats(null);

    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    if (autoEndTimeoutRef.current) {
      clearTimeout(autoEndTimeoutRef.current);
      autoEndTimeoutRef.current = null;
    }
  }, [bookId]);

  // 主初始化逻辑
  useEffect(() => {
    if (!bookId || isInitialized || isAutoEnded || !isVisible) {
      return;
    }

    const doInitialization = async () => {
      await initializeSession();
      startPauseTimer();
      startAutoEndTimer();
    };

    doInitialization();
  }, [bookId, isInitialized, isAutoEnded, isVisible, initializeSession, startPauseTimer, startAutoEndTimer]);

  // 组件卸载时的清理
  const currentSession = currentSessionRef.current;
  const sessionStatsRef = useRef(sessionStats);

  useEffect(() => {
    sessionStatsRef.current = sessionStats;
  });

  useEffect(() => {
    return () => {
      const session = currentSessionRef.current;
      const stats = sessionStatsRef.current;
      if (session && stats && stats.totalActiveTime > 0) {
        completeReadingSession(session.id).catch(console.error);
      }

      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
      if (autoEndTimeoutRef.current) clearTimeout(autoEndTimeoutRef.current);
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      if (sessionEndTimerRef.current) clearTimeout(sessionEndTimerRef.current);
    };
  }, []);

  return {
    currentSession,
    sessionStats,
    isInitialized,
    endSession,
  };
};
