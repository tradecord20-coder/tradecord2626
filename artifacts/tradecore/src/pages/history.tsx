import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarDays, Download, MousePointer2, TrendingUp } from 'lucide-react';
import { getGetPerformanceQueryKey, useGetPerformance } from '@workspace/api-client-react';
import { ErrorPanel, EmptyPanel, LoadingPanel, PnlValue, SectionHeading } from '@/components/trade-primitives';

type Period = 'week' | 'fifteen_days' | 'month' | 'year';
const periods: { value: Period; label: string }[] = [
  { value: 'week', label: '7 days' },
  { value: 'fifteen_days', label: '15 days' },
  { value: 'month', label: '30 days' },
  { value: 'year', label: '12 months' },
];

function PerformanceChart({ points }: { points: { label: string; value: number; wins: number; trades: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const values = points.map((point) => point.value);
  const min = Math.min(0, ...values); const max = Math.max(0, ...values); const range = max - min || 1;
  const zeroY = 92 - ((0 - min) / range) * 74;
  const coordinates = points.map((point, index) => `${(index / Math.max(1, points.length - 1)) * 100},${92 - ((point.value - min) / range) * 74}`).join(' ');
  const area = `0,${zeroY} ${coordinates} 100,${zeroY}`;
  return <div className="relative pt-4" data-testid="chart-performance">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-[260px] w-full overflow-visible">
      <defs><linearGradient id="history-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="hsl(79 83% 60% / .23)" /><stop offset="1" stopColor="hsl(79 83% 60% / 0)" /></linearGradient></defs>
      <line x1="0" x2="100" y1={zeroY} y2={zeroY} stroke="hsl(186 12% 24%)" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
      <polygon points={area} fill="url(#history-fill)" />
      <polyline points={coordinates} fill="none" stroke="hsl(79 83% 60%)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      {points.map((point, index) => {
        const [x, y] = coordinates.split(' ')[index].split(',');
        return <g key={`${point.label}-${index}`} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)}><circle cx={x} cy={y} r={hovered === index ? 2.5 : 1.4} fill="hsl(79 83% 60%)" stroke="hsl(192 14% 10%)" strokeWidth="1" vectorEffect="non-scaling-stroke" /><rect x={Number(x) - 3} y="0" width="6" height="100" fill="transparent" /></g>;
      })}
    </svg>
    <div className="mt-2 flex justify-between font-mono-app text-[9px] text-muted-foreground">{points.map((point, index) => <span key={index} className={index % Math.ceil(points.length / 6) === 0 ? '' : 'hidden sm:block'}>{point.label}</span>)}</div>
    {hovered !== null && points[hovered] && <div className="pointer-events-none absolute right-3 top-2 rounded-lg border border-border bg-popover px-3 py-2 shadow-[var(--shadow)]" data-testid="chart-tooltip"><div className="font-mono-app text-[10px] text-muted-foreground">{points[hovered].label}</div><div className="mt-1 font-mono-app text-sm text-primary">{points[hovered].value >= 0 ? '+' : ''}{points[hovered].value.toFixed(2)}%</div><div className="mt-1 text-[10px] text-muted-foreground">{points[hovered].wins} wins / {points[hovered].trades} trades</div></div>}
  </div>;
}

export default function History() {
  const [period, setPeriod] = useState<Period>('month');
  const performanceQuery = useGetPerformance({ period }, { query: { queryKey: getGetPerformanceQueryKey({ period }) } });
  const performance = performanceQuery.data;
  const summary = useMemo(() => {
    if (!performance) return null;
    const wins = performance.points.reduce((total, point) => total + point.wins, 0);
    return { wins, losses: Math.max(0, performance.totalTrades - wins) };
  }, [performance]);

  return <div className="panel-grid min-h-[calc(100dvh-62px)]">
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-9 lg:py-8">
      <div className="stagger-in mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><div className="mb-2 flex items-center gap-2 font-mono-app text-[10px] uppercase tracking-[0.18em] text-muted-foreground"><CalendarDays size={13} /> Review room</div><h1 className="text-[30px] font-semibold tracking-[-0.06em] sm:text-[38px]">Performance, without the noise.</h1><p className="mt-1.5 max-w-lg text-sm text-muted-foreground">A compact read on what your operating system has actually done.</p></div>
        <button type="button" onClick={() => window.alert('Export is available once a reporting connection is configured.')} data-testid="button-export-performance" className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><Download size={14} /> Export report</button>
      </div>

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1" role="tablist" aria-label="Performance period">
        {periods.map((item) => <button key={item.value} type="button" role="tab" aria-selected={period === item.value} onClick={() => setPeriod(item.value)} data-testid={`button-period-${item.value}`} className={`rounded-md px-4 py-2 text-xs transition-colors ${period === item.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>{item.label}</button>)}
      </div>

      {performanceQuery.isLoading ? <div className="grid gap-5 lg:grid-cols-[1.5fr_0.75fr]"><LoadingPanel lines={6} /><LoadingPanel lines={4} /></div> : performanceQuery.isError || !performance ? <ErrorPanel retry={() => performanceQuery.refetch()} /> : performance.points.length === 0 ? <EmptyPanel title="No performance history yet" detail="Once completed trades are recorded, this room will show your period curve." /> : <div className="grid gap-5 lg:grid-cols-[1.5fr_0.75fr]">
        <section className="stagger-in stagger-1 rounded-xl border border-card-border bg-card p-4 sm:p-6">
          <SectionHeading eyebrow="Cumulative return" title={`${periods.find((item) => item.value === period)?.label} trace`} detail="Values are normalized from the first point in this period." action={<span className="flex items-center gap-1.5 font-mono-app text-[9px] uppercase text-muted-foreground"><MousePointer2 size={12} /> inspect points</span>} />
          <PerformanceChart points={performance.points} />
        </section>
        <section className="stagger-in stagger-2 space-y-3">
          <div className="rounded-xl border border-card-border bg-card p-5"><div className="mb-4 font-mono-app text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Period return</div><PnlValue value={performance.totalReturn} percent={performance.winRate} large /><div className="mt-5 flex items-center gap-2 text-xs text-primary"><TrendingUp size={14} /> {performance.totalTrades} total executions</div></div>
          <div className="rounded-xl border border-card-border bg-card p-5"><div className="mb-4 font-mono-app text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Trade quality</div><div className="mb-5 flex items-end justify-between"><span className="font-mono-app text-3xl tracking-[-0.06em]">{performance.winRate.toFixed(1)}%</span><span className="text-xs text-muted-foreground">win rate</span></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, performance.winRate))}%` }} /></div><div className="mt-4 grid grid-cols-2 gap-3 font-mono-app text-[10px]"><div><span className="block text-muted-foreground">wins</span><span className="mt-1 block text-accent">{summary?.wins ?? 0}</span></div><div><span className="block text-muted-foreground">losses</span><span className="mt-1 block text-destructive">{summary?.losses ?? 0}</span></div></div></div>
          <div className="rounded-xl border border-primary/15 bg-primary/5 p-5"><div className="flex items-start gap-3"><div className="mt-0.5 text-primary">{performance.totalReturn >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}</div><p className="text-xs leading-relaxed text-muted-foreground">This is a record of realized system behavior, not a promise about the next session.</p></div></div>
        </section>
      </div>}

      {performance && performance.points.length > 0 && <section className="stagger-in stagger-3 mt-8"><SectionHeading eyebrow="Period detail" title="The underlying checkpoints" detail="Each checkpoint keeps the wins and total executions accountable." /><div className="overflow-x-auto rounded-xl border border-card-border bg-card"><table className="w-full min-w-[560px] text-left"><thead className="border-b border-border bg-secondary/30 font-mono-app text-[9px] uppercase tracking-[0.14em] text-muted-foreground"><tr><th className="px-5 py-3 font-normal">Checkpoint</th><th className="px-5 py-3 font-normal">Value</th><th className="px-5 py-3 font-normal">Wins</th><th className="px-5 py-3 font-normal">Executions</th><th className="px-5 py-3 text-right font-normal">Quality</th></tr></thead><tbody className="divide-y divide-border">{performance.points.map((point, index) => <tr key={`${point.label}-${index}`} data-testid={`row-performance-${index}`} className="transition-colors hover:bg-secondary/30"><td className="px-5 py-3.5 font-mono-app text-xs">{point.label}</td><td className={`px-5 py-3.5 font-mono-app text-xs ${point.value >= 0 ? 'text-primary' : 'text-destructive'}`}>{point.value >= 0 ? '+' : ''}{point.value.toFixed(2)}%</td><td className="px-5 py-3.5 font-mono-app text-xs text-accent">{point.wins}</td><td className="px-5 py-3.5 font-mono-app text-xs text-muted-foreground">{point.trades}</td><td className="px-5 py-3.5 text-right font-mono-app text-xs text-muted-foreground">{point.trades ? ((point.wins / point.trades) * 100).toFixed(1) : '0.0'}%</td></tr>)}</tbody></table></div></section>}
    </div>
  </div>;
}