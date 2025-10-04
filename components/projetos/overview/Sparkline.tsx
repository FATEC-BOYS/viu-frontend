"use client";

type Point = { dia: string; qtd: number };

// sparkline leve em SVG (sem libs)
export default function Sparkline({
  data,
  height = 36,
  strokeWidth = 2,
  showLast = true,
}: {
  data: Point[];
  height?: number;
  strokeWidth?: number;
  showLast?: boolean;
}) {
  if (!data?.length) {
    return <div className="text-xs text-muted-foreground">Sem dados recentes</div>;
  }

  const w = 160;
  const h = height;
  const xs = data.map((_, i) => (i / (data.length - 1)) * (w - 4) + 2);
  const max = Math.max(...data.map(d => d.qtd), 1);
  const ys = data.map(d => h - (d.qtd / max) * (h - 4) - 2);

  const dAttr = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x},${ys[i]}`).join(" ");

  const last = data[data.length - 1];
  const lastX = xs[xs.length - 1];
  const lastY = ys[ys.length - 1];

  return (
    <div className="flex items-center gap-2">
      <svg width={w} height={h} className="overflow-visible">
        <path d={dAttr} fill="none" stroke="currentColor" strokeOpacity={0.8} strokeWidth={strokeWidth} />
        <circle cx={lastX} cy={lastY} r={3} className="text-primary" fill="currentColor" />
      </svg>
      {showLast && (
        <div className="text-xs text-muted-foreground">
          Hoje: <span className="font-medium">{last.qtd}</span>
        </div>
      )}
    </div>
  );
}
