import { AlertCircle, ArrowDownRight, ArrowUpRight, Check, CircleDashed, LoaderCircle, LockKeyhole, Pause, Radio, RefreshCw, ShieldCheck } from 'lucide-react';

export function SectionHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <div className="mb-1 font-mono-app text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</div>
        <h2 className="text-[17px] font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-secondary ${className}`} />;
}

export function LoadingPanel({ lines = 3 }: { lines?: number }) {
  return <div className="space-y-3 rounded-xl border border-card-border bg-card p-5" data-testid="status-loading">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-8 w-36" />
    {Array.from({ length: lines }).map((_, index) => <Skeleton key={index} className="h-3 w-full" />)}
  </div>;
}

export function ErrorPanel({ message = 'The data link did not answer.', retry }: { message?: string; retry: () => void }) {
  return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6" data-testid="status-error">
    <AlertCircle className="mb-3 text-destructive" size={20} />
    <p className="text-sm font-medium">Could not load this surface</p>
    <p className="mt-1 text-xs text-muted-foreground">{message}</p>
    <button type="button" onClick={retry} data-testid="button-retry" className="mt-4 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary"><RefreshCw size={13} /> Retry connection</button>
  </div>;
}

export function EmptyPanel({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-center" data-testid="status-empty">
    <CircleDashed className="mx-auto mb-3 text-muted-foreground" size={22} />
    <p className="text-sm font-medium">{title}</p>
    <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{detail}</p>
  </div>;
}

export function LiveBadge({ status, label }: { status: 'live' | 'protected' | 'paused' | 'ready' | 'waiting'; label?: string }) {
  const map = {
    live: { icon: Radio, text: label ?? 'live', style: 'text-primary bg-primary/10 border-primary/20' },
    protected: { icon: LockKeyhole, text: label ?? 'protected', style: 'text-accent bg-accent/10 border-accent/20' },
    paused: { icon: Pause, text: label ?? 'paused', style: 'text-chart-3 bg-chart-3/10 border-chart-3/20' },
    ready: { icon: Check, text: label ?? 'ready', style: 'text-accent bg-accent/10 border-accent/20' },
    waiting: { icon: CircleDashed, text: label ?? 'waiting', style: 'text-muted-foreground bg-secondary border-border' },
  }[status];
  const Icon = map.icon;
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono-app text-[9px] uppercase tracking-[0.08em] ${map.style}`}><Icon size={11} />{map.text}</span>;
}

export function PnlValue({ value, percent, large = false }: { value: number; percent?: number; large?: boolean }) {
  const positive = value >= 0;
  return <span className={`${positive ? 'text-primary' : 'text-destructive'} ${large ? 'text-2xl' : 'text-sm'} font-mono-app font-medium tabular-nums`}>
    {positive ? '+' : '-'}₹{Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    {percent !== undefined && <small className="ml-1 text-[10px]">({positive ? '+' : ''}{percent.toFixed(2)}%)</small>}
  </span>;
}

export function Direction({ side }: { side: string }) {
  const positive = side === 'BUY';
  return <span className={`inline-flex items-center gap-1 font-mono-app text-[10px] font-medium ${positive ? 'text-primary' : 'text-chart-3'}`}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{positive ? 'long' : 'short'}</span>;
}

export function SavingIndicator({ saving, saved }: { saving: boolean; saved: boolean }) {
  if (saving) return <span className="inline-flex items-center gap-1.5 font-mono-app text-[10px] text-muted-foreground"><LoaderCircle size={12} className="animate-spin" /> writing</span>;
  if (saved) return <span className="inline-flex items-center gap-1.5 font-mono-app text-[10px] text-accent"><ShieldCheck size={12} /> saved</span>;
  return null;
}