import { FormEvent, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, ChevronRight, CircleAlert, Link2, MessageSquareText, RefreshCw, ServerCog, ShieldCheck, SlidersHorizontal, Webhook } from 'lucide-react';
import { useGetChannels, useGetDashboard, useHealthCheck, useReceiveWhatsappWebhook } from '@workspace/api-client-react';
import { ErrorPanel, LiveBadge, LoadingPanel, SectionHeading } from '@/components/trade-primitives';

function ReadinessRow({ icon: Icon, title, detail, status, action }: { icon: typeof ServerCog; title: string; detail: string; status: 'ready' | 'waiting' | 'paused'; action?: ReactNode }) {
  return <div className="flex items-center gap-3 border-b border-border py-4 last:border-0"><div className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground"><Icon size={16} /></div><div className="min-w-0 flex-1"><div className="text-sm font-medium">{title}</div><div className="mt-1 text-xs text-muted-foreground">{detail}</div></div><div className="flex shrink-0 items-center gap-3">{action}<LiveBadge status={status} /></div></div>;
}

export default function Settings() {
  const healthQuery = useHealthCheck();
  const dashboardQuery = useGetDashboard();
  const channelsQuery = useGetChannels();
  const webhook = useReceiveWhatsappWebhook();
  const [message, setMessage] = useState('status');
  const [from, setFrom] = useState('');
  const [sent, setSent] = useState(false);

  const sendTest = (event: FormEvent) => {
    event.preventDefault();
    setSent(false);
    webhook.mutate({ data: { message, From: from || undefined } }, { onSuccess: () => { setSent(true); setMessage('status'); } });
  };

  const healthy = healthQuery.data?.status === 'ok' || healthQuery.data?.status === 'healthy';
  const alertStatus = dashboardQuery.data?.alertStatus;
  return <div className="panel-grid min-h-[calc(100dvh-62px)]">
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 lg:px-9 lg:py-8">
      <div className="stagger-in mb-8"><div className="mb-2 flex items-center gap-2 font-mono-app text-[10px] uppercase tracking-[0.18em] text-muted-foreground"><SlidersHorizontal size={13} /> Configuration surface</div><h1 className="text-[30px] font-semibold tracking-[-0.06em] sm:text-[38px]">Readiness before reach.</h1><p className="mt-1.5 max-w-lg text-sm text-muted-foreground">Verify every connection and notification route before the system is trusted to speak.</p></div>

      <section className="stagger-in stagger-1 mb-7">
        <SectionHeading eyebrow="System check" title="Connection readiness" detail="A green state means the route answered now, not that it will always answer." action={<button type="button" onClick={() => { void healthQuery.refetch(); void dashboardQuery.refetch(); void channelsQuery.refetch(); }} data-testid="button-refresh-readiness" className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"><RefreshCw size={13} /> Recheck</button>} />
        <div className="rounded-xl border border-card-border bg-card px-4 sm:px-5">
          {healthQuery.isLoading || dashboardQuery.isLoading || channelsQuery.isLoading ? <div className="space-y-3 py-4"><LoadingPanel lines={1} /><LoadingPanel lines={1} /></div> : healthQuery.isError ? <div className="py-5"><ErrorPanel message="The health endpoint did not respond." retry={() => healthQuery.refetch()} /></div> : <>
            <ReadinessRow icon={ServerCog} title="TradeCore API" detail={healthy ? 'Health endpoint answered successfully.' : `Reported status: ${healthQuery.data?.status ?? 'unknown'}.`} status={healthy ? 'ready' : 'waiting'} action={<span className="font-mono-app text-[10px] text-muted-foreground">/api/healthz</span>} />
            <ReadinessRow icon={Link2} title="Market data link" detail="Quotes and trade feed use the connected data plane." status={channelsQuery.isError ? 'waiting' : 'ready'} action={<span className="font-mono-app text-[10px] text-accent">online</span>} />
            <ReadinessRow icon={ShieldCheck} title="Automation guardrails" detail={`${channelsQuery.data?.filter((channel) => channel.active).length ?? 0} active channel(s) declare their posture.`} status={channelsQuery.data?.length ? 'ready' : 'waiting'} action={<span className="font-mono-app text-[10px] text-muted-foreground">{channelsQuery.data?.length ?? 0} lanes</span>} />
            <ReadinessRow icon={MessageSquareText} title="WhatsApp control route" detail="Configured control number: +91 90500 93930" status={alertStatus === 'armed' ? 'ready' : 'waiting'} action={<span className="font-mono-app text-[10px] text-muted-foreground">{alertStatus === 'armed' ? 'armed' : 'awaiting provider'}</span>} />
          </>}
        </div>
      </section>

      <div className="grid gap-7 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="stagger-in stagger-2">
          <SectionHeading eyebrow="Alert delivery" title="Notification route" detail="The current dashboard status is the source of truth." />
          <div className="rounded-xl border border-card-border bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between"><div className="grid size-10 place-items-center rounded-lg bg-secondary text-muted-foreground"><Webhook size={18} /></div>{alertStatus === 'armed' ? <LiveBadge status="live" label="armed" /> : alertStatus === 'paused' ? <LiveBadge status="paused" label="paused" /> : <LiveBadge status="waiting" label="not configured" />}</div>
            <h3 className="mt-5 text-base font-medium">{alertStatus === 'armed' ? 'Alerts are ready to speak.' : 'Alerts are waiting for configuration.'}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{alertStatus === 'armed' ? 'The configured route is armed. Use the command test below to verify an inbound message path.' : 'No alert delivery controls are available until the notification route is configured by the connected operator service.'}</p>
            <div className="mt-5 grid gap-2 rounded-lg border border-border bg-secondary/30 p-3 font-mono-app text-[10px] text-muted-foreground sm:grid-cols-2"><div><span className="block uppercase tracking-[0.12em] text-[8px]">Admin log inbox</span><span className="mt-1 block text-foreground">tradecord20@gmail.com</span></div><div><span className="block uppercase tracking-[0.12em] text-[8px]">WhatsApp control</span><span className="mt-1 block text-foreground">+91 90500 93930</span></div></div>
            <div className="mt-6 rounded-lg border border-border bg-secondary/40 p-3.5"><div className="flex gap-3"><CircleAlert size={15} className="mt-0.5 shrink-0 text-chart-3" /><p className="text-[11px] leading-relaxed text-muted-foreground">TradeCore does not expose a local switch for alert arming. This prevents the cockpit from implying a state the automation service has not confirmed.</p></div></div>
          </div>
        </section>

        <section className="stagger-in stagger-3">
          <SectionHeading eyebrow="Inbound command" title="Send a route test" detail="Use a real command shape, then inspect the response." />
          <form onSubmit={sendTest} className="rounded-xl border border-card-border bg-card p-5 sm:p-6">
            <label className="mb-2 block font-mono-app text-[9px] uppercase tracking-[0.14em] text-muted-foreground" htmlFor="command-message">Message body</label>
            <input id="command-message" value={message} onChange={(event) => setMessage(event.target.value)} data-testid="input-command-message" className="mb-4 h-10 w-full rounded-lg border border-input bg-secondary/50 px-3 font-mono-app text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-1 focus:ring-primary/30" placeholder="status" />
            <label className="mb-2 block font-mono-app text-[9px] uppercase tracking-[0.14em] text-muted-foreground" htmlFor="command-from">Sender (optional)</label>
            <input id="command-from" value={from} onChange={(event) => setFrom(event.target.value)} data-testid="input-command-from" className="mb-5 h-10 w-full rounded-lg border border-input bg-secondary/50 px-3 font-mono-app text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:ring-1 focus:ring-primary/30" placeholder="+1 555 000 0000" />
            <button type="submit" disabled={webhook.isPending || !message.trim()} data-testid="button-send-command-test" className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-50"><MessageSquareText size={14} /> {webhook.isPending ? 'Sending test…' : 'Send test command'} <ChevronRight size={14} /></button>
            {sent && <div className="mt-3 flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/10 px-3 py-2.5 font-mono-app text-[10px] text-accent" data-testid="status-command-sent"><Check size={13} /> Route accepted the test command.</div>}
            {webhook.isError && <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-[10px] text-destructive" data-testid="status-command-error">The route rejected the test. Check readiness and try again.</div>}
          </form>
        </section>
      </div>

      <div className="stagger-in stagger-4 mt-7 rounded-xl border border-border bg-secondary/30 p-4 sm:p-5"><div className="flex items-center gap-3"><div className="grid size-8 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary"><Check size={15} /></div><div><div className="text-xs font-medium">The cockpit is intentionally conservative.</div><div className="mt-1 text-[11px] text-muted-foreground">Settings show verified API state; they never simulate a connected broker or alert route.</div></div></div></div>
    </div>
  </div>;
}