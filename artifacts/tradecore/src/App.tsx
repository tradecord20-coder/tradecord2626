import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();
const ADMIN_PASSWORD = '9050093930';

/**
 * ============================================================================
 * ENTRY PAGE: TradeCore Live - Dual Button Login
 * ============================================================================
 * Ultra-clean dark-mode landing page with exactly two prominent buttons:
 * 1. Customer Login -> HFT Dashboard
 * 2. Admin Login -> Admin Command Center
 */
function EntryPage() {
  const [, setLocation] = useLocation();
  const [adminInputOpen, setAdminInputOpen] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState('');

  const handleCustomerLogin = () => {
    setLocation('/dashboard');
  };

  const handleAdminLoginClick = () => {
    setAdminInputOpen(true);
    setAdminError('');
    setAdminPin('');
  };

  const handleAdminSubmit = () => {
    if (adminPin === ADMIN_PASSWORD) {
      setAdminInputOpen(false);
      setAdminPin('');
      setAdminError('');
      setLocation('/admin');
    } else {
      setAdminError('Invalid PIN. Access denied.');
      setAdminPin('');
    }
  };

  const handleAdminCancel = () => {
    setAdminInputOpen(false);
    setAdminPin('');
    setAdminError('');
  };

  return (
    <div className="relative w-full min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="relative z-10 px-6 py-8 border-b border-border/30">
        <div className="max-w-screen-2xl mx-auto">
          <h1 className="text-3xl font-bold font-mono-app text-foreground tracking-tight">
            TradeCore Live
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono-app">
            PWA • HFT Dashboard & Admin Command Center
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm space-y-8 text-center">
          {/* Logo / Icon Area */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10 border border-primary/20">
              <div className="text-2xl font-bold text-primary font-mono-app">⚡</div>
            </div>
            <p className="text-sm text-muted-foreground font-mono-app">
              Select your role to continue
            </p>
          </div>

          {/* Button Container */}
          <div className="space-y-4">
            {/* Customer Login Button */}
            <button
              onClick={handleCustomerLogin}
              className="relative w-full group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
              <div
                className="relative w-full px-8 py-4 rounded-lg border border-primary/30 bg-primary/5 
                hover:bg-primary/10 active:scale-95 transition-all duration-200
                flex items-center justify-center gap-3 group-hover:border-primary/50"
              >
                <span className="text-lg">👤</span>
                <div className="text-left">
                  <div className="font-semibold text-foreground font-mono-app text-sm">
                    Customer Login
                  </div>
                  <div className="text-xs text-muted-foreground font-mono-app">
                    HFT Dashboard & Markets
                  </div>
                </div>
                <span className="ml-auto text-primary font-bold">→</span>
              </div>
            </button>

            {/* Admin Login Button */}
            <button
              onClick={handleAdminLoginClick}
              className="relative w-full group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-primary/20 rounded-lg blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
              <div
                className="relative w-full px-8 py-4 rounded-lg border border-accent/30 bg-accent/5 
                hover:bg-accent/10 active:scale-95 transition-all duration-200
                flex items-center justify-center gap-3 group-hover:border-accent/50"
              >
                <span className="text-lg">🔐</span>
                <div className="text-left">
                  <div className="font-semibold text-foreground font-mono-app text-sm">
                    Admin Login
                  </div>
                  <div className="text-xs text-muted-foreground font-mono-app">
                    Command Center & P&L
                  </div>
                </div>
                <span className="ml-auto text-accent font-bold">→</span>
              </div>
            </button>
          </div>

          {/* Features Preview */}
          <div className="pt-4 space-y-2 text-xs text-muted-foreground font-mono-app border-t border-border/30">
            <p>✓ 2-Pilot HFT Dashboard</p>
            <p>✓ Crypto Strategy & Bitcoin Directional</p>
            <p>✓ Delta Exchange Market Pulse</p>
            <p>✓ Deposit/Withdrawal Controls</p>
            <p>✓ PWA Install Ready</p>
          </div>
        </div>
      </main>

      {/* Admin PIN Modal */}
      {adminInputOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-card-border rounded-lg p-8 w-full max-w-sm shadow-lg space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground font-mono-app">
                Admin Authentication
              </h2>
              <p className="text-xs text-muted-foreground mt-2 font-mono-app">
                Enter your master PIN to access the Admin Command Center
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="password"
                value={adminPin}
                onChange={(e) => {
                  setAdminPin(e.target.value);
                  setAdminError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAdminSubmit();
                  } else if (e.key === 'Escape') {
                    handleAdminCancel();
                  }
                }}
                placeholder="Enter PIN"
                className="w-full px-4 py-2 rounded-lg border border-input bg-input 
                  text-foreground placeholder:text-muted-foreground
                  focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent
                  font-mono-app text-sm tracking-widest"
                autoFocus
              />
              {adminError && (
                <p className="text-xs text-destructive font-mono-app">{adminError}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAdminCancel}
                className="flex-1 px-4 py-2 rounded-lg border border-border/50 bg-background/50
                  hover:bg-background transition-colors duration-200
                  text-foreground text-sm font-mono-app"
              >
                Cancel
              </button>
              <button
                onClick={handleAdminSubmit}
                disabled={!adminPin}
                className="flex-1 px-4 py-2 rounded-lg border border-accent/50 bg-accent/10
                  hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200
                  text-foreground text-sm font-mono-app font-semibold"
              >
                Authenticate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ============================================================================
 * PLACEHOLDER PAGES
 * ============================================================================
 */

function DashboardPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-screen-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-4 font-mono-app">
          2-Pilot HFT Dashboard
        </h1>
        <p className="text-muted-foreground font-mono-app mb-6">
          Crypto Strategy • Bitcoin Directional • Wallet • P&L • Market Pulse
        </p>
        <div className="space-y-4">
          <div className="p-6 rounded-lg border border-border/30 bg-card">
            <h2 className="text-lg font-semibold text-card-foreground font-mono-app mb-2">
              Crypto Strategy
            </h2>
            <p className="text-sm text-muted-foreground font-mono-app">Strategy tracking coming soon...</p>
          </div>
          <div className="p-6 rounded-lg border border-border/30 bg-card">
            <h2 className="text-lg font-semibold text-card-foreground font-mono-app mb-2">
              Bitcoin Directional
            </h2>
            <p className="text-sm text-muted-foreground font-mono-app">Directional analysis coming soon...</p>
          </div>
          <div className="p-6 rounded-lg border border-border/30 bg-card">
            <h2 className="text-lg font-semibold text-card-foreground font-mono-app mb-2">
              Wallet
            </h2>
            <p className="text-sm text-muted-foreground font-mono-app">Wallet management coming soon...</p>
          </div>
          <div className="p-6 rounded-lg border border-border/30 bg-card">
            <h2 className="text-lg font-semibold text-card-foreground font-mono-app mb-2">
              P&L
            </h2>
            <p className="text-sm text-muted-foreground font-mono-app">Profit & Loss tracking coming soon...</p>
          </div>
          <div className="p-6 rounded-lg border border-border/30 bg-card">
            <h2 className="text-lg font-semibold text-card-foreground font-mono-app mb-2">
              Delta Exchange Market Pulse
            </h2>
            <p className="text-sm text-muted-foreground font-mono-app">Real-time market data coming soon...</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button className="px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 font-mono-app text-sm">
              Deposit
            </button>
            <button className="px-4 py-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-400 font-mono-app text-sm">
              Withdrawal
            </button>
          </div>
          <button
            onClick={() => setLocation('/')}
            className="w-full mt-6 px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary font-mono-app text-sm"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-screen-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-4 font-mono-app">
          Admin Command Center
        </h1>
        <p className="text-muted-foreground font-mono-app mb-6">
          User P&L Tracking & System Administration
        </p>
        <div className="space-y-4">
          <div className="p-6 rounded-lg border border-border/30 bg-card">
            <h2 className="text-lg font-semibold text-card-foreground font-mono-app mb-2">
              User P&L Tracking
            </h2>
            <p className="text-sm text-muted-foreground font-mono-app">Performance analytics dashboard coming soon...</p>
          </div>
          <div className="p-6 rounded-lg border border-border/30 bg-card">
            <h2 className="text-lg font-semibold text-card-foreground font-mono-app mb-2">
              System Controls
            </h2>
            <p className="text-sm text-muted-foreground font-mono-app">Administrative tools and settings coming soon...</p>
          </div>
          <button
            onClick={() => setLocation('/')}
            className="w-full mt-6 px-4 py-2 rounded-lg bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent font-mono-app text-sm"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

function NotFoundPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground font-mono-app">404</h1>
        <p className="text-muted-foreground font-mono-app">Page not found</p>
        <button
          onClick={() => setLocation('/')}
          className="mt-4 px-4 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary font-mono-app text-sm"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}

/**
 * ============================================================================
 * ROUTER & APP BOOTSTRAP
 * ============================================================================
 */

function Router() {
  return (
    <Switch>
      <Route path="/" component={EntryPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`);
    }
    return () => {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = '';
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
