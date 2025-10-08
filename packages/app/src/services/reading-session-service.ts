import type { ReadingSession, ReadingSessionCreateData, ReadingSessionUpdateData } from "@/types/reading-session";
import { invoke } from "@tauri-apps/api/core";
import dayjs from "dayjs";

/**
 * 创建新的阅读会话
 */
export async function createReadingSession(data: ReadingSessionCreateData): Promise<ReadingSession> {
  try {
    const result = await invoke<ReadingSession>("create_reading_session", { data });
    return result;
  } catch (error) {
    console.error("创建阅读会话失败:", error);
    throw new Error(`创建阅读会话失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 获取单个阅读会话
 */
export async function getReadingSession(sessionId: string): Promise<ReadingSession | null> {
  try {
    const result = await invoke<ReadingSession | null>("get_reading_session", { sessionId });
    return result;
  } catch (error) {
    console.error("获取阅读会话失败:", error);
    throw new Error(`获取阅读会话失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 更新阅读会话
 */
export async function updateReadingSession(
  sessionId: string,
  updateData: ReadingSessionUpdateData,
): Promise<ReadingSession> {
  try {
    const result = await invoke<ReadingSession>("update_reading_session", {
      sessionId,
      updateData,
    });
    return result;
  } catch (error) {
    console.error("更新阅读会话失败:", error);
    throw new Error(`更新阅读会话失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 获取书籍的阅读会话列表
 */
export async function getReadingSessionsByBook(bookId: string, limit?: number): Promise<ReadingSession[]> {
  try {
    const result = await invoke<ReadingSession[]>("get_reading_sessions_by_book", {
      bookId,
      limit,
    });
    return result;
  } catch (error) {
    console.error("获取书籍会话列表失败:", error);
    throw new Error(`获取书籍会话列表失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 获取书籍的活跃阅读会话（未结束的会话）
 */
export async function getActiveReadingSession(bookId: string): Promise<ReadingSession | null> {
  try {
    const result = await invoke<ReadingSession | null>("get_active_reading_session", { bookId });
    return result;
  } catch (error) {
    console.error("获取活跃阅读会话失败:", error);
    throw new Error(`获取活跃阅读会话失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 完成阅读会话（设置结束时间）
 */
export async function completeReadingSession(sessionId: string): Promise<ReadingSession> {
  const now = Date.now();
  return updateReadingSession(sessionId, {
    endedAt: now,
  });
}

/**
 * 计算会话的实际阅读时长（秒）
 */
export function calculateSessionDuration(startedAt: number, endedAt?: number, totalActiveTimeMs?: number): number {
  const endTime = endedAt || Date.now();
  const sessionDurationMs = totalActiveTimeMs || endTime - startedAt;
  return Math.round(sessionDurationMs / 1000); // 转换为秒
}

/**
 * 获取所有阅读会话列表
 */
export async function getAllReadingSessions(
  limit?: number,
  startDate?: number,
  endDate?: number,
): Promise<ReadingSession[]> {
  try {
    const result = await invoke<ReadingSession[]>("get_all_reading_sessions", {
      limit,
      startDate,
      endDate,
    });
    return result;
  } catch (error) {
    console.error("获取所有阅读会话失败:", error);
    throw new Error(`获取所有阅读会话失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}

/**
 * 获取阅读会话统计数据（按日期聚合）
 */
export interface ReadingSessionStats {
  date: string; // YYYY-MM-DD格式
  count: number; // 当天的阅读会话数
  totalDuration: number; // 当天总阅读时长（秒）
}

export async function getReadingSessionStats(startDate?: number, endDate?: number): Promise<ReadingSessionStats[]> {
  try {
    const sessions = await getAllReadingSessions(undefined, startDate, endDate);
    console.log("sessions", sessions);

    // 按日期聚合数据
    const statsMap = new Map<string, { count: number; totalDuration: number }>();

    sessions.forEach((session) => {
      const date = dayjs(session.startedAt).format("YYYY-MM-DD");
      const existing = statsMap.get(date) || { count: 0, totalDuration: 0 };

      statsMap.set(date, {
        count: existing.count + 1,
        totalDuration: existing.totalDuration + session.durationSeconds,
      });
    });

    // 转换为数组并排序
    return Array.from(statsMap.entries())
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        totalDuration: stats.totalDuration,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("获取阅读会话统计失败:", error);
    throw new Error(`获取阅读会话统计失败: ${error instanceof Error ? error.message : "未知错误"}`);
  }
}
