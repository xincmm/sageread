import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ReadingSessionStats } from "@/services/reading-session-service";
import HeatMap from "@uiw/react-heat-map";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";

interface ReadingHeatMapProps {
  data: ReadingSessionStats[];
}

interface HeatMapValue {
  date: string;
  count: number;
  content?: string;
}

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
  const { ref, width } = useResizeObserver<HTMLDivElement>();

  const today = useMemo(() => dayjs().format("YYYY-MM-DD"), []);

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    const start = new Date(currentYear, 0, 1);
    const end = new Date(currentYear, 11, 31);

    return { startDate: start, endDate: end };
  }, []);

  const cols = useMemo(() => {
    return 53;
  }, []);

  const { rectSize, space, containerHeight, showLabels } = useMemo(() => {
    const minCell = 8;
    const maxCell = 18;
    const gap = 2;
    const padding = 16;

    const daysInWeek = 7;
    const topLabelHeight = 30;
    const bottomPadding = 20;

    const shouldShowLabels = width > 350;
    let calculatedRectSize = minCell;
    if (width && cols > 0) {
      const usableWidth = Math.max(0, width - padding * 2 - (cols - 1) * gap);
      const sideLength = Math.floor(usableWidth / cols);
      calculatedRectSize = Math.max(minCell, Math.min(maxCell, sideLength));
    }

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

  const heatMapValue = useMemo<HeatMapValue[]>(() => {
    return data.map((item) => {
      const minutes = Math.max(0, Math.round(item.totalDuration / 60));
      return {
        date: item.date.replace(/-/g, "/"),
        count: minutes,
        content: `${item.date}: ${minutes}分钟`,
      };
    });
  }, [data]);

  const maxCount = useMemo(() => {
    const minutesList = data.map((item) => Math.max(0, Math.round(item.totalDuration / 60)));
    return Math.max(...minutesList, 0);
  }, [data]);

  const panelColors = useMemo(() => {
    const colors: Record<number, string> = { 0: "#f5f5f5" };

    if (maxCount <= 0) return colors;

    const s1 = Math.max(1, Math.round(maxCount * 0.2));
    const s2 = Math.max(s1 + 1, Math.round(maxCount * 0.4));
    const s3 = Math.max(s2 + 1, Math.round(maxCount * 0.6));
    const s4 = Math.max(s3 + 1, Math.round(maxCount * 0.8));
    const s5 = Math.max(s4 + 1, maxCount);

    colors[s1] = "oklch(96.2% 0.059 95.617)";
    colors[s2] = "oklch(92.4% 0.12 95.746)";
    colors[s3] = "oklch(87.9% 0.169 91.605)";
    colors[s4] = "oklch(82.8% 0.189 84.429)";
    colors[s5] = "oklch(76.9% 0.188 70.08)";

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
            color: "#525252",
          }}
          monthLabels={
            showLabels ? ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"] : []
          }
          weekLabels={showLabels ? ["日", "一", "二", "三", "四", "五", "六"] : []}
          rectRender={(props, data) => {
            const isToday = data.date === today.replace(/-/g, "/");
            const originalDate = data.date.replace(/\//g, "-");
            const hasData = data.count > 0;
            const minutes = Math.max(0, Math.round(Number(data.count) || 0));

            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <rect
                    {...props}
                    rx={2}
                    ry={2}
                    className={`cursor-pointer hover:stroke-2 hover:stroke-blue-400 ${
                      isToday ? "stroke-2 stroke-blue-500 dark:stroke-blue-300" : ""
                    }`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1 text-xs">
                    <div className="font-medium">{originalDate}</div>
                    {hasData ? (
                      <div className="text-neutral-200">{minutes}分钟</div>
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

          <div className="flex items-center gap-4">
            <div className="text-xs">今年共阅读 {data.filter((item) => item.totalDuration > 0).length} 天</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingHeatMap;
