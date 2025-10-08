import { type ReadingSessionStats, getReadingSessionStats } from "@/services/reading-session-service";
import { BookIcon, CalendarIcon, ClockIcon, TrendingUpIcon } from "lucide-react";
import { useEffect, useState } from "react";
import ReadingHeatMap from "./components/reading-heat-map";
import StatCard from "./components/stat-card";

const StatisticsPage = () => {
  const [stats, setStats] = useState<ReadingSessionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const endDate = new Date();
        const currentYear = endDate.getFullYear();
        const startDate = new Date(currentYear, 0, 1);

        const data = await getReadingSessionStats(startDate.getTime(), endDate.getTime());

        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载统计数据失败");
        console.error("加载统计数据失败:", err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const totalSessions = stats.reduce((sum, day) => sum + day.count, 0);
  const totalDuration = stats.reduce((sum, day) => sum + day.totalDuration, 0);
  const totalDays = stats.filter((day) => day.count > 0).length;
  const averageSessionsPerDay = totalDays > 0 ? totalSessions / totalDays : 0;

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700 dark:border-neutral-600 dark:border-t-neutral-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-950">
          <div className="text-center text-red-700 dark:text-red-300">
            <p className="font-medium text-lg">加载失败</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 overflow-auto p-3">
      <div className="space-y-2">
        <h1 className="font-bold text-3xl text-neutral-900 dark:text-neutral-100">阅读统计</h1>
        <p className="text-neutral-600 dark:text-neutral-400">查看您的阅读习惯和统计数据</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="总阅读会话"
          value={totalSessions.toString()}
          icon={<BookIcon className="h-4 w-4" />}
          description="累计阅读次数"
        />
        <StatCard
          title="总阅读时长"
          value={`${Math.floor(totalDuration / 3600)}h ${Math.floor((totalDuration % 3600) / 60)}m`}
          icon={<ClockIcon className="h-4 w-4" />}
          description="累计阅读小时数"
        />
        <StatCard
          title="活跃天数"
          value={totalDays.toString()}
          icon={<CalendarIcon className="h-4 w-4" />}
          description="有阅读记录的天数"
        />
        <StatCard
          title="平均每日会话"
          value={averageSessionsPerDay.toFixed(1)}
          icon={<TrendingUpIcon className="h-4 w-4" />}
          description="活跃日平均会话数"
        />
      </div>

      <div className="rounded-lg border border-neutral-150 p-4 dark:border-neutral-800">
        <div className="space-y-2 pb-4">
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">阅读活动热力图</h3>
          <p className="text-neutral-600 text-sm dark:text-neutral-400">
            过去一年的阅读活动分布，颜色深浅表示当天的阅读强度
          </p>
        </div>
        <ReadingHeatMap data={stats} />
      </div>
    </div>
  );
};

export default StatisticsPage;
