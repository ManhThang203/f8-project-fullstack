export type DateSeriesPoint = {
  date: string;
  count: number;
};

/** Pad chuỗi ngày thiếu với count = 0 để line chart hiển thị đủ range. */
export function fillDateSeries(
  points: DateSeriesPoint[],
  days: number,
): DateSeriesPoint[] {
  const map = new Map(points.map((p) => [p.date, p.count]));
  const result: DateSeriesPoint[] = [];
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, count: map.get(key) ?? 0 });
  }

  return result;
}

/** Format ngày ISO cho trục X chart (dd/MM). */
export function formatChartDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}`;
}

/** Format ngày ISO cho tooltip (dd/MM/yyyy). */
export function formatChartTooltipDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}
