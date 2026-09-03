import { Activity, BarChart3, ChevronRight, CircleHelp, Command, ExternalLink, Settings2, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';

type TradeShellProps = { children: ReactNode };

const navItems = [
  { href: '/', label: 'Live desk', icon: Activity },
  { href: '/history', label: 'Performance', icon: BarChart3 },
  { href: '/settings', label: 'Readiness', icon: Settings2 },
];

export function TradeShell({ children }: TradeShellProps) {
  const [location] = useLocation();
  const isLive = location === '/';
  const deltaExchangeIndia = 'https://www.delta.exchange/in';

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] border-r border-border bg-[hsl(192_14%_9%)] px-4 py-5 lg:flex lg:flex-col">
        <Link href="/" data-testid="link-brand" className="mb-10 flex items-center gap-3 px-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_24px_hsl(79_83%_60%_/_0.15)]">
            <Command size={19} strokeWidth={2.5} />
          </span>
          <span>
            <span className="block text-[15px] font-semibold tracking-[-0.02em]">tradecore</span>
            <span className="font-mono-app block text-[9px] uppercase tracking-[0.18em] text-muted-foreground">private ops</span>
          </span>
        </Link>

        <div className="mb-3 px-2 font-mono-app text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Workspace</div>
        <nav className="space-y-1" aria-label="Primary navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link
                key={href}
                href={href}
                data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}
                className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-[13px] transition-colors ${
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-3"><Icon size={16} /><span>{label}</span></span>
                {active && <ChevronRight size={14} />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <div className="mb-5 rounded-lg border border-border bg-secondary/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-foreground">
              <span className="size-1.5 rounded-full bg-primary pulse-dot" />
              Operator mode
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">No unattended actions. Every channel declares its posture.</p>
          </div>
          <button type="button" onClick={() => window.alert('TradeCore operator guide is coming soon.')} data-testid="button-help" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <CircleHelp size={16} /> Operating guide
          </button>
          <div className="mt-5 flex items-center justify-between border-t border-border px-2 pt-4">
            <span className="font-mono-app text-[10px] text-muted-foreground">v0.8.4</span>
            <span className="flex items-center gap-1.5 font-mono-app text-[10px] text-accent"><ShieldCheck size={12} /> local</span>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[236px]">
        <header className="sticky top-0 z-20 flex h-[62px] items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6 lg:px-9">
          <div className="flex items-center gap-3">
            <span className="font-mono-app text-[10px] uppercase tracking-[0.16em] text-muted-foreground">TradeCore</span>
            <span className="hidden h-3 w-px bg-border sm:block" />
            <span className="hidden text-xs text-muted-foreground sm:block">{isLive ? 'Live desk' : location === '/history' ? 'Historical performance' : 'System readiness'}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-1.5 sm:flex">
              <a href={deltaExchangeIndia} target="_blank" rel="noreferrer noopener" data-testid="link-deposit" className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 font-mono-app text-[9px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">Deposit <ExternalLink size={10} /></a>
              <a href={deltaExchangeIndia} target="_blank" rel="noreferrer noopener" data-testid="link-withdraw" className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 font-mono-app text-[9px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">Withdraw <ExternalLink size={10} /></a>
            </div>
            <div className="flex items-center gap-2 font-mono-app text-[10px] uppercase tracking-[0.1em] text-accent">
              <span className="size-1.5 rounded-full bg-accent pulse-dot" /> data link nominal
            </div>
            <div className="hidden h-5 w-px bg-border sm:block" />
            <div className="hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex"><span className="size-6 rounded-md border border-border bg-secondary grid place-items-center text-[10px] font-semibold text-foreground">OP</span> Operator</div>
          </div>
        </header>

        <main className="pb-24 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-[68px] grid-cols-3 border-t border-border bg-[hsl(192_14%_9%_/_0.96)] px-3 backdrop-blur-lg lg:hidden" aria-label="Mobile navigation">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = location === href;
          return (
            <Link key={href} href={href} data-testid={`link-mobile-nav-${label.toLowerCase().replace(' ', '-')}`} className={`flex flex-col items-center justify-center gap-1 text-[10px] ${active ? 'text-primary' : 'text-muted-foreground'}`}>
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}