export interface ReadingSession {
  id: string;
  bookId: string;
  startedAt: number;
  endedAt?: number;
  durationSeconds: number;
  createdAt: number;
  updatedAt: number;
}

export interface ReadingSessionCreateData {
  bookId: string;
  startedAt: number;
}

export interface ReadingSessionUpdateData {
  endedAt?: number;
  durationSeconds?: number;
}

// 会话状态枚举
export enum SessionState {
  ACTIVE = "active", // 正在阅读
  PAUSED = "paused", // 暂停（失焦/长时间无活动）
  STOPPED = "stopped", // 已结束
}

// 活动检测配置
export interface ActivityConfig {
  pauseThreshold: number; // 暂停阈值（毫秒）
  autoEndThreshold: number; // 自动结束阈值（毫秒）
  saveInterval: number; // 保存间隔（毫秒）
}

// 会话统计数据
export interface SessionStats {
  totalActiveTime: number; // 总活跃时间（毫秒）
  sessionStartTime: number; // 会话开始时间
  lastActivityTime: number; // 最后活动时间
  currentState: SessionState; // 当前状态
}
