import { useState } from 'react';
import { ArrowDown, ArrowUp, Clock3, DollarSign, Gauge, MoreHorizontal, RefreshCw, ShieldAlert, SlidersHorizontal, TrendingUp, WalletCards } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetChannelsQueryKey, getGetDashboardQueryKey, getGetPerformanceQueryKey, getGetQuotesQueryKey, getGetTradesQueryKey, useGetChannels, useGetDashboard, useGetPerformance, useGetQuotes, useGetTrades, useUpdateChannel } from '@workspace/api-client-react';
import { ErrorPanel, EmptyPanel, Direction, LiveBadge, LoadingPanel, PnlValue, SectionHeading, Skeleton, SavingIndicator } from '@/components/trade-primitives';

const currency = (value: number, digits = 2) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
const timeAgo = (date: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  return minutes < 1 ? 'just now' : `${minutes}m ago`;
};
const channelIcon: Record<string, string> = { bot: 'BOT', chart: 'CHT', bolt: 'BLT', layers: 'LYR', globe: 'GLB' };

function MetricCard({ label, value, detail, tone = 'default', icon: Icon }: { label: string; value: string; detail: string; tone?: 'default' | 'positive' | 'warning'; icon: typeof WalletCards }) {
  return <div className="stagger-in rounded-xl border border-card-border bg-card p-4 shadow-[var(--shadow)]">
    <div className="mb-5 flex items-center justify-between text-muted-foreground"><span className="font-mono-app text-[9px] uppercase tracking-[0.16em]">{label}</span><Icon size={15} /></div>
    <div className={`font-mono-app text-[22px] font-medium tracking-[-0.04em] ${tone === 'positive' ? 'text-primary' : tone === 'warning' ? 'text-chart-3' : 'text-foreground'}`}>{value}</div>
    <div className="mt-1 text-[11px] text-muted-foreground">{detail}</div>
  </div>;
}

function MiniCurve({ values, positive = true }: { values: number[]; positive?: boolean }) {
  if (!values.length) return <div className="h-24" />;
  const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1;
  const path = values.map((value, i) => `${(i / Math.max(1, values.length - 1)) * 100},${92 - ((value - min) / range) * 74}`).join(' ');
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-24 w-full overflow-visible" aria-label="Performance curve" data-testid="chart-dashboard-performance">
    <defs><linearGradient id="curve-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={positive ? 'hsl(79 83% 60% / .2)' : 'hsl(3 69% 60% / .2)'} /><stop offset="1" stopColor="transparent" /></linearGradient></defs>
    <polyline points={`0,100 ${path} 100,100`} fill="url(#curve-fill)" stroke="none" />
    <polyline points={path} fill="none" stroke={positive ? 'hsl(79 83% 60%)' : 'hsl(3 69% 60%)'} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
  </svg>;
}

export default function Dashboard() {
  const queryClient = useQueryClient();
  const dashboardQuery = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey(), refetchInterval: 15000, staleTime: 10000 } });
  const quotesQuery = useGetQuotes({ query: { queryKey: getGetQuotesQueryKey(), refetchInterval: 15000, staleTime: 10000 } });
  const channelsQuery = useGetChannels({ query: { queryKey: getGetChannelsQueryKey(), refetchInterval: 30000 } });
  const tradesQuery = useGetTrades({ query: { queryKey: getGetTradesQueryKey(), refetchInterval: 15000, staleTime: 10000 } });
  const performanceQuery = useGetPerformance({ period: 'week' }, { query: { queryKey: getGetPerformanceQueryKey({ period: 'week' }) } });
  const updateChannel = useUpdateChannel();
  const [savedChannel, setSavedChannel] = useState<string | null>(null);
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({});

  if (dashboardQuery.isLoading) return <div className="mx-auto max-w-[1440px] space-y-5 px-4 py-6 sm:px-6 lg:px-9"><div><Skeleton className="h-3 w-24" /><Skeleton className="mt-3 h-9 w-64" /></div><div className="grid gap-3 md:grid-cols-4">{[1, 2, 3, 4].map((item) => <LoadingPanel key={item} lines={1} />)}</div><div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]"><LoadingPanel lines={5} /><LoadingPanel lines={4} /></div></div>;
  if (dashboardQuery.isError || !dashboardQuery.data) return <div className="mx-auto max-w-xl px-4 py-16"><ErrorPanel retry={() => dashboardQuery.refetch()} /></div>;
  const dashboard = dashboardQuery.data;
  const quotes = quotesQuery.data ?? [];
  const channels = channelsQuery.data ?? [];
  const trades = tradesQuery.data ?? [];
  const performance = performanceQuery.data;

  const handleToggle = (id: string, active: boolean) => {
    setSavedChannel(null);
    const channel = channels.find((item) => item.id === id);
    const budget = Number(budgetInputs[id] ?? channel?.budget ?? 0);
    updateChannel.mutate({ id, data: { active, budget } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetChannelsQueryKey() });
        setSavedChannel(id);
        window.setTimeout(() => setSavedChannel(null), 1800);
      },
    });
  };
  const handleSaveStart = (id: string) => handleToggle(id, true);

  const alertState = dashboard.alertStatus === 'armed' ? 'live' : dashboard.alertStatus === 'paused' ? 'paused' : 'waiting';
  return <div className="panel-grid min-h-[calc(100dvh-62px)]">
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-9 lg:py-8">
      <div className="stagger-in mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 font-mono-app text-[10px] uppercase tracking-[0.18em] text-accent"><span className="size-1.5 rounded-full bg-accent pulse-dot" /> Market session active</div>
          <h1 className="text-[30px] font-semibold tracking-[-0.06em] sm:text-[38px]">Good morning, operator.</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Your book, automation, and guardrails in one measured view.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Clock3 size={14} /> Updated {timeAgo(dashboard.lastUpdated)} <button type="button" onClick={() => { void dashboardQuery.refetch(); void quotesQuery.refetch(); void tradesQuery.refetch(); }} data-testid="button-refresh-dashboard" className="ml-1 rounded-md border border-border p-2 transition-colors hover:bg-secondary hover:text-foreground"><RefreshCw size={13} /></button></div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Wallet balance" value={currency(dashboard.walletBalance)} detail="Available trading capital" icon={WalletCards} />
        <MetricCard label="Today’s P&L" value={`${dashboard.dayPnl >= 0 ? '+' : '-'}${currency(Math.abs(dashboard.dayPnl))}`} detail={`${dashboard.dayPnlPercent >= 0 ? '+' : ''}${dashboard.dayPnlPercent.toFixed(2)}% against open`} tone={dashboard.dayPnl >= 0 ? 'positive' : 'warning'} icon={TrendingUp} />
        <MetricCard label="Active trades" value={String(dashboard.activeTrades).padStart(2, '0')} detail="Across live channels" icon={Gauge} />
        <MetricCard label="Win rate" value={`${dashboard.winRate.toFixed(1)}%`} detail="Rolling active book" tone="positive" icon={ShieldAlert} />
      </div>

      <div className="mb-8 overflow-hidden rounded-xl border border-card-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5"><div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary pulse-dot" /><span className="font-mono-app text-[10px] uppercase tracking-[0.15em]">Market pulse</span></div><span className="font-mono-app text-[9px] uppercase text-muted-foreground">aggregated sources</span></div>
        <div className="flex divide-x divide-border overflow-x-auto">
          {quotesQuery.isLoading ? [1, 2, 3, 4].map((item) => <Skeleton key={item} className="m-4 h-10 min-w-[170px]" />) : quotes.length ? quotes.map((quote) => <div className="min-w-[180px] flex-1 px-4 py-4 sm:px-5" key={quote.symbol} data-testid={`quote-${quote.symbol}`}>
            <div className="mb-2 flex items-center justify-between"><span className="font-mono-app text-xs font-semibold">{quote.symbol}</span><span className="text-[9px] text-muted-foreground">{quote.source}</span></div>
            <div className="flex items-baseline justify-between gap-2"><span className="font-mono-app text-[15px] tabular-nums">{quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className={`flex items-center text-[10px] ${quote.change >= 0 ? 'text-primary' : 'text-destructive'}`}>{quote.change >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{Math.abs(quote.changePercent).toFixed(2)}%</span></div>
          </div>) : <div className="w-full px-5 py-5 text-xs text-muted-foreground">No quote sources are reporting right now.</div>}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <section className="stagger-in stagger-1 min-w-0">
          <SectionHeading eyebrow="Automation channels" title="Your operating lanes" detail="A channel can be active without being unguarded." action={<button type="button" onClick={() => window.alert('Channel creation is not enabled for this workspace.')} data-testid="button-channel-options" className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><SlidersHorizontal size={14} /></button>} />
          <div className="space-y-2">
            {channelsQuery.isLoading ? [1, 2, 3].map((item) => <LoadingPanel key={item} lines={2} />) : channels.length ? channels.map((channel, index) => <div key={channel.id} data-testid={`card-channel-${channel.id}`} className="group rounded-xl border border-card-border bg-card p-4 transition-colors hover:border-muted-foreground/30" style={{ borderLeftColor: channel.accent, borderLeftWidth: 2 }}>
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary font-mono-app text-[9px] font-semibold text-muted-foreground">{channelIcon[channel.icon] ?? channel.icon.slice(0, 3).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-medium">{channel.name}</h3><LiveBadge status={channel.status === 'running' ? 'live' : channel.status === 'paused' ? 'paused' : 'ready'} label={channel.status} /></div><p className="mt-1 text-xs text-muted-foreground">{channel.description}</p></div>
                <button type="button" aria-label={`${channel.active ? 'Pause' : 'Activate'} ${channel.name}`} onClick={() => handleToggle(channel.id, !channel.active)} disabled={updateChannel.isPending} data-testid={`button-toggle-channel-${channel.id}`} className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${channel.active ? 'border-primary/50 bg-primary' : 'border-border bg-secondary'} disabled:opacity-60`}><span className={`absolute top-[3px] size-[18px] rounded-full transition-transform ${channel.active ? 'translate-x-[20px] bg-primary-foreground' : 'translate-x-[3px] bg-muted-foreground'}`} /></button>
              </div>
              <div className="mt-4 grid gap-3 border-t border-border pt-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div><label htmlFor={`budget-${channel.id}`} className="mb-1.5 block font-mono-app text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Lane budget / INR</label><input id={`budget-${channel.id}`} type="number" min="0" step="100" value={budgetInputs[channel.id] ?? String(channel.budget)} onChange={(event) => setBudgetInputs((current) => ({ ...current, [channel.id]: event.target.value }))} data-testid={`input-budget-${channel.id}`} className="h-9 w-full rounded-lg border border-input bg-secondary/50 px-3 font-mono-app text-xs text-foreground outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/30" /></div>
                <div className="flex items-center justify-between gap-3 sm:justify-end"><div className="flex items-center gap-4 font-mono-app text-[10px] text-muted-foreground"><span>posture <b className={`font-medium ${channel.active ? 'text-primary' : 'text-muted-foreground'}`}>{channel.active ? 'engaged' : 'held'}</b></span><SavingIndicator saving={updateChannel.isPending && updateChannel.variables?.id === channel.id} saved={savedChannel === channel.id} /></div><button type="button" onClick={() => handleSaveStart(channel.id)} disabled={updateChannel.isPending} data-testid={`button-save-start-${channel.id}`} className="rounded-lg bg-primary px-3 py-2 font-mono-app text-[9px] font-semibold uppercase tracking-[0.08em] text-primary-foreground transition-all hover:brightness-110 disabled:opacity-50">{channel.active ? 'Save budget' : `Save & start ${index + 1}`}</button></div>
              </div>
            </div>) : <EmptyPanel title="No channels configured" detail="Automation lanes will appear here once your operator profile is connected." />}
          </div>
        </section>

        <section className="stagger-in stagger-2">
          <SectionHeading eyebrow="Safety posture" title="Guardrails are visible" />
          <div className="rounded-xl border border-card-border bg-card p-5">
            <div className="flex items-start justify-between"><div className={`grid size-11 place-items-center rounded-xl ${alertState === 'live' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}><ShieldAlert size={21} /></div><LiveBadge status={alertState} label={dashboard.alertStatus.replace('_', ' ')} /></div>
            <h3 className="mt-5 text-base font-medium">{dashboard.alertStatus === 'armed' ? 'Alerting is armed' : dashboard.alertStatus === 'paused' ? 'Alerting is paused' : 'Alerting needs setup'}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{dashboard.alertStatus === 'armed' ? 'Trade events will reach your configured notification route.' : dashboard.alertStatus === 'paused' ? 'No alert messages will be sent until you resume the route.' : 'Connect a notification route in readiness before relying on automated alerts.'}</p>
            <div className="mt-6 space-y-2 border-t border-border pt-4 font-mono-app text-[10px]"><div className="flex justify-between"><span className="text-muted-foreground">execution mode</span><span className="text-foreground">guarded</span></div><div className="flex justify-between"><span className="text-muted-foreground">risk controls</span><span className="text-accent">enforced</span></div><div className="flex justify-between"><span className="text-muted-foreground">last audit</span><span>{timeAgo(dashboard.lastUpdated)}</span></div></div>
          </div>

          <div className="mt-6 rounded-xl border border-card-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between"><div><div className="font-mono-app text-[9px] uppercase tracking-[0.18em] text-muted-foreground">This week</div><div className="mt-1 text-sm font-medium">Performance trace</div></div>{performance && <PnlValue value={performance.totalReturn} percent={performance.winRate} />}</div>
            {performanceQuery.isLoading ? <Skeleton className="h-24 w-full" /> : performance ? <MiniCurve values={performance.points.map((point) => point.value)} positive={performance.totalReturn >= 0} /> : <div className="flex h-24 items-center text-xs text-muted-foreground">No performance points yet.</div>}
            {performance && <div className="mt-3 flex justify-between border-t border-border pt-3 font-mono-app text-[9px] text-muted-foreground"><span>{performance.totalTrades} trades</span><span>{performance.points.length ? performance.points[0].label : '—'} → {performance.points.length ? performance.points.at(-1)?.label : '—'}</span></div>}
          </div>
        </section>
      </div>

      <section className="stagger-in stagger-3 mt-8">
        <SectionHeading eyebrow="Open exposure" title="Active trade monitor" detail={`${trades.length} positions currently reporting`} action={<span className="font-mono-app text-[10px] text-muted-foreground">live feed <span className="ml-1 inline-block size-1.5 rounded-full bg-primary pulse-dot" /></span>} />
            {tradesQuery.isLoading ? <LoadingPanel lines={5} /> : tradesQuery.isError ? <ErrorPanel message="Trade feed is temporarily unavailable." retry={() => tradesQuery.refetch()} /> : trades.length === 0 ? <EmptyPanel title="No active exposure" detail="When a guarded trade is active, its entry, current mark, and protection status will appear here." /> : <div className="overflow-x-auto rounded-xl border border-card-border bg-card"><table className="w-full min-w-[720px] text-left"><thead className="border-b border-border bg-secondary/30 font-mono-app text-[9px] uppercase tracking-[0.14em] text-muted-foreground"><tr><th className="px-5 py-3 font-normal">Asset</th><th className="px-5 py-3 font-normal">Channel</th><th className="px-5 py-3 font-normal">Direction</th><th className="px-5 py-3 font-normal">Entry / mark</th><th className="px-5 py-3 font-normal">P&L</th><th className="px-5 py-3 font-normal">State</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-border">{trades.map((trade) => <tr key={trade.id} data-testid={`row-trade-${trade.id}`} className="transition-colors hover:bg-secondary/30"><td className="px-5 py-4"><div className="font-mono-app text-xs font-semibold">{trade.asset}</div><div className="mt-1 text-[10px] text-muted-foreground">{timeAgo(trade.updatedAt)}</div></td><td className="px-5 py-4 text-xs text-muted-foreground">{trade.channel}</td><td className="px-5 py-4"><Direction side={trade.side} /></td><td className="px-5 py-4 font-mono-app text-[10px] text-muted-foreground">{currency(trade.entryPrice)} <span className="mx-1 text-border">/</span> <span className="text-foreground">{currency(trade.currentPrice)}</span></td><td className="px-5 py-4"><PnlValue value={trade.pnl} percent={trade.pnlPercent} /></td><td className="px-5 py-4"><LiveBadge status={trade.status === 'protected' ? 'protected' : trade.status === 'executing' ? 'live' : 'waiting'} label={trade.status} /></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => window.alert(`Trade ${trade.id} is read-only from the live desk.`)} data-testid={`button-trade-menu-${trade.id}`} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><MoreHorizontal size={16} /></button></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  </div>;
}