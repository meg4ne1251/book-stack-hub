"use client";

import { useMemo } from "react";
import type { HeatmapData } from "@/types/api";

interface HeatmapProps {
  data: HeatmapData;
  year?: number;
}

const CELL_SIZE = 13;
const CELL_GAP = 3;
const MONTH_LABELS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];
const DAY_LABELS = ["", "月", "", "水", "", "金", ""];

function getColor(count: number): string {
  if (count === 0) return "var(--heatmap-0, #ebedf0)";
  if (count === 1) return "var(--heatmap-1, #9be9a8)";
  if (count <= 3) return "var(--heatmap-2, #40c463)";
  return "var(--heatmap-3, #216e39)";
}

export function ReadingHeatmap({ data, year }: HeatmapProps) {
  const currentYear = year || new Date().getFullYear();

  const { weeks, monthPositions } = useMemo(() => {
    const weeks: { date: string; count: number; totalPages: number }[][] = [];
    const monthPositions: { month: number; weekIndex: number }[] = [];

    // Start from 52 weeks ago (or Jan 1 of the given year)
    const endDate = year
      ? new Date(currentYear, 11, 31)
      : new Date();
    const startDate = year
      ? new Date(currentYear, 0, 1)
      : new Date(endDate.getTime() - 364 * 24 * 60 * 60 * 1000);

    // Adjust to start on Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    let currentWeek: { date: string; count: number; totalPages: number }[] = [];
    let lastMonth = -1;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().split("T")[0];
      const dayData = data[dateStr];

      if (current.getDay() === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      const month = current.getMonth();
      if (month !== lastMonth) {
        monthPositions.push({ month, weekIndex: weeks.length });
        lastMonth = month;
      }

      currentWeek.push({
        date: dateStr,
        count: dayData?.count || 0,
        totalPages: dayData?.total_pages || 0,
      });

      current.setDate(current.getDate() + 1);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return { weeks, monthPositions };
  }, [data, currentYear, year]);

  const svgWidth = weeks.length * (CELL_SIZE + CELL_GAP) + 30;
  const svgHeight = 7 * (CELL_SIZE + CELL_GAP) + 25;

  return (
    <div className="overflow-x-auto">
      <svg width={svgWidth} height={svgHeight} className="text-xs">
        {/* Month labels */}
        {monthPositions.map(({ month, weekIndex }, i) => (
          <text
            key={i}
            x={weekIndex * (CELL_SIZE + CELL_GAP) + 30}
            y={10}
            className="fill-muted-foreground"
            fontSize={10}
          >
            {MONTH_LABELS[month]}
          </text>
        ))}

        {/* Day labels */}
        {DAY_LABELS.map((label, i) =>
          label ? (
            <text
              key={i}
              x={0}
              y={i * (CELL_SIZE + CELL_GAP) + 25 + CELL_SIZE - 2}
              className="fill-muted-foreground"
              fontSize={9}
            >
              {label}
            </text>
          ) : null
        )}

        {/* Cells */}
        {weeks.map((week, weekIndex) =>
          week.map((day, dayIndex) => (
            <rect
              key={`${weekIndex}-${dayIndex}`}
              x={weekIndex * (CELL_SIZE + CELL_GAP) + 30}
              y={dayIndex * (CELL_SIZE + CELL_GAP) + 18}
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={2}
              fill={getColor(day.count)}
              className="cursor-pointer"
            >
              <title>
                {day.date}: {day.count}件
                {day.totalPages > 0 ? ` / ${day.totalPages}ページ` : ""}
              </title>
            </rect>
          ))
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
        <span>少</span>
        {[0, 1, 2, 4].map((count) => (
          <div
            key={count}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: getColor(count) }}
          />
        ))}
        <span>多</span>
      </div>
    </div>
  );
}
