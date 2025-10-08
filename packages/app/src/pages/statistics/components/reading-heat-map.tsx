import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ReadingSessionStats } from "@/services/reading-session-service";
import HeatMap from "@uiw/react-heat-map";
import { useEffect, useMemo, useRef, useState } from "react";

interface ReadingHeatMapProps {
  data: ReadingSessionStats[];
}

interface HeatMapValue {
  date: string;
  // 使用分钟数作为热力图的强度值
  count: number;
  // 透传当天的 session 数，供 Tooltip 展示
  sessions?: number;
  content?: string;
}

// ResizeObserver hook for responsive layout
function useResizeObserver<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    let raf = 0;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setWidth(cr.width));
    });
    ro.observe(ref.current);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return { ref, width };
}

const ReadingHeatMap = ({ data }: ReadingHeatMapProps) => {
  // 使用 ResizeObserver 监听容器宽度
  const { ref, width } = useResizeObserver<HTMLDivElement>();

  // 获取当前日期
  const today = useMemo(() => {
    const now = new Date();
    return now.toISOString().split("T")[0]; // YYYY-MM-DD 格式
  }, []);

  // 计算当前年份的完整日期范围
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    // 当前年份的1月1日到12月31日
    const start = new Date(currentYear, 0, 1); // 1月1日
    const end = new Date(currentYear, 11, 31); // 12月31日

    return { startDate: start, endDate: end };
  }, []);

  // 年视图的列数（周数）
  const cols = useMemo(() => {
    // 一年大约有53周，热力图需要53列
    return 53;
  }, []);

  // 响应式计算格子尺寸
  const { rectSize, space, containerHeight, showLabels } = useMemo(() => {
    // 配置参数
    const minCell = 8; // 最小格子尺寸
    const maxCell = 18; // 最大格子尺寸
    const gap = 2; // 格子间距
    const padding = 16; // 与width减去的32px保持一致 (32/2=16px每边)

    // 一周7天，热力图需要7行
    const daysInWeek = 7;
    // 顶部月份标签高度大约是30px
    const topLabelHeight = 30;
    // 底部留白
    const bottomPadding = 20;

    // 宽度不足时隐藏标签，避免挤占空间
    const shouldShowLabels = width > 350;

    // 动态计算格子尺寸
    let calculatedRectSize = minCell;
    if (width && cols > 0) {
      const usableWidth = Math.max(0, width - padding * 2 - (cols - 1) * gap);
      const sideLength = Math.floor(usableWidth / cols);
      calculatedRectSize = Math.max(minCell, Math.min(maxCell, sideLength));
    }

    // 计算容器高度：7个方块 + 6个间距 + 顶部标签 + 底部留白
    const heatmapHeight =
      calculatedRectSize * daysInWeek +
      gap * (daysInWeek - 1) +
      (shouldShowLabels ? topLabelHeight : 10) +
      bottomPadding;

    return {
      rectSize: calculatedRectSize,
      space: gap,
      containerHeight: Math.floor(heatmapHeight),
      showLabels: shouldShowLabels,
    };
  }, [width, cols]);

  // 转换数据格式以适应HeatMap组件
  const heatMapValue = useMemo<HeatMapValue[]>(() => {
    return data.map((item) => {
      const minutes = Math.max(0, Math.round(item.totalDuration / 60));
      return {
        date: item.date.replace(/-/g, "/"), // 转换为 YYYY/MM/DD 格式
        count: minutes, // 以分钟数作为颜色计算依据
        sessions: item.count, // 保留当天 session 数用于展示
        content: `${item.date}: ${item.count}次阅读, ${minutes}分钟`,
      };
    });
  }, [data]);

  // 根据数据范围动态设置颜色方案
  const maxCount = useMemo(() => {
    // 以分钟数作为最大值参考
    const minutesList = data.map((item) => Math.max(0, Math.round(item.totalDuration / 60)));
    return Math.max(...minutesList, 0);
  }, [data]);

  // 定义颜色方案 - 使用neutral色系，修复类型错误
  const panelColors = useMemo(() => {
    // Blue 色系：0（无）使用 neutral-100，其余为蓝色分段
    const colors: Record<number, string> = { 0: "#f5f5f5" }; // neutral-100

    if (maxCount <= 0) return colors;

    const s1 = Math.max(1, Math.round(maxCount * 0.2));
    const s2 = Math.max(s1 + 1, Math.round(maxCount * 0.4));
    const s3 = Math.max(s2 + 1, Math.round(maxCount * 0.6));
    const s4 = Math.max(s3 + 1, Math.round(maxCount * 0.8));
    const s5 = Math.max(s4 + 1, maxCount); // 极值

    colors[s1] = "oklch(96.2% 0.059 95.617)"; // blue-100
    colors[s2] = "oklch(92.4% 0.12 95.746)"; // blue-200
    colors[s3] = "oklch(87.9% 0.169 91.605)"; // blue-300
    colors[s4] = "oklch(82.8% 0.189 84.429)"; // blue-400
    colors[s5] = "oklch(76.9% 0.188 70.08)"; // blue-600

    return colors;
  }, [maxCount]);

  return (
    <div className="w-full overflow-hidden">
      <div ref={ref} className="w-full">
        <HeatMap
          value={heatMapValue}
          startDate={startDate}
          endDate={endDate}
          panelColors={panelColors}
          rectSize={rectSize}
          legendCellSize={0}
          space={space}
          width={width > 0 ? width - 32 : undefined}
          height={containerHeight}
          style={{
            color: "#525252", // neutral-600
          }}
          monthLabels={
            showLabels ? ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"] : []
          }
          weekLabels={showLabels ? ["日", "一", "二", "三", "四", "五", "六"] : []}
          rectRender={(props, data) => {
            const isToday = data.date === today.replace(/-/g, "/");
            const originalDate = data.date.replace(/\//g, "-"); // 转换回 YYYY-MM-DD 格式
            const hasData = data.count > 0; // 以分钟数判断
            const minutes = Math.max(0, Math.round(Number(data.count) || 0));
            const sessions = (data as unknown as HeatMapValue).sessions ?? undefined;

            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <rect
                    {...props}
                    rx={2}
                    ry={2}
                    className={`cursor-pointer hover:stroke-2 hover:stroke-blue-400 ${
                      isToday ? "stroke-2 stroke-blue-700 dark:stroke-blue-600" : ""
                    }`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1 text-xs">
                    <div className="font-medium">{originalDate}</div>
                    {hasData ? (
                      <div className="text-neutral-200">
                        {typeof sessions === "number" && <div>{sessions}次阅读</div>}
                        <div>{minutes}分钟</div>
                      </div>
                    ) : (
                      <div className="text-neutral-300">无阅读记录</div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          }}
        />

        <div className="flex items-center justify-between text-neutral-600 text-sm dark:text-neutral-400">
          <div className="flex items-center gap-2 text-xs">
            <span>少</span>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: panelColors[0] }} />
              {Object.keys(panelColors)
                .filter((key) => key !== "0")
                .sort((a, b) => Number(a) - Number(b))
                .slice(0, 4)
                .map((key) => (
                  <div key={key} className="h-3 w-3 rounded-sm" style={{ backgroundColor: panelColors[Number(key)] }} />
                ))}
            </div>
            <span>多</span>
          </div>

          {/* 其他图例 */}
          <div className="flex items-center gap-4">
            <div className="text-xs">今年共阅读 {data.filter((item) => item.totalDuration > 0).length} 天</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingHeatMap;
