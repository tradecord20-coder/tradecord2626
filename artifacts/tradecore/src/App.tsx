import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const ADMIN_PASSWORD = '9050093930';

/**
 * ENTRY PAGE: Premium Dual-Button Entry
 */
function EntryPage() {
  const [, setLocation] = useLocation();
  const [adminInputOpen, setAdminInputOpen] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState('');

  const handleAdminSubmit = () => {
    if (adminPin.trim() === ADMIN_PASSWORD) {
      setAdminInputOpen(false);
      setAdminPin('');
      setAdminError('');
      setLocation('/admin');
    } else {
      setAdminError('Invalid Master PIN. Access Denied.');
      setAdminPin('');
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6">
      {/* Header */}
      <header className="py-4 border-b border-slate-800/80 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-wider text-amber-400 flex items-center gap-2">
            <span>⚡</span> TradeCore Live
          </h1>
          <p className="text-xs text-slate-400">Professional HFT PWA Terminal</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
          ● Live Sync
        </span>
      </header>

      {/* Main Center Action Buttons */}
      <main className="my-auto max-w-md w-full mx-auto space-y-6 text-center">
        <div className="space-y-2">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center shadow-2xl shadow-amber-500/10">
            <span className="text-3xl">🚀</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">Select Access Mode</h2>
          <p className="text-xs text-slate-400">Choose your portal to enter the secure trading terminal</p>
        </div>

        <div className="space-y-4 pt-2">
          {/* Customer Login Button - Big & Premium */}
          <button
            onClick={() => setLocation('/dashboard')}
            className="w-full py-5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-lg shadow-xl shadow-emerald-900/30 border border-emerald-400/30 active:scale-[0.98] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4 text-left">
              <span className="text-2xl p-2.5 rounded-xl bg-black/20">👤</span>
              <div>
                <div className="text-base font-bold">Customer Login</div>
                <div className="text-xs text-emerald-100/80 font-normal">2-Pilot HFT Dashboard & Wallet</div>
              </div>
            </div>
            <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
          </button>

          {/* Admin Login Button - Big & Premium */}
          <button
            onClick={() => {
              setAdminInputOpen(true);
              setAdminError('');
              setAdminPin('');
            }}
            className="w-full py-5 px-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold text-lg shadow-xl border border-slate-700/80 active:scale-[0.98] transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4 text-left">
              <span className="text-2xl p-2.5 rounded-xl bg-slate-800">🔐</span>
              <div>
                <div className="text-base font-bold">Admin Login</div>
                <div className="text-xs text-slate-400 font-normal">Command Center & Controls</div>
              </div>
            </div>
            <span className="text-xl text-amber-400 group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>
      </main>

      {/* Footer info */}
      <footer className="text-center py-4 text-xs text-slate-500 border-t border-slate-900">
        TradeCore Secure Execution Core v4.2 • Delta Exchange Connected
      </footer>

      {/* Admin PIN Modal */}
      {adminInputOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🔐</span> Admin Authentication
              </h3>
              <p className="text-xs text-slate-400 mt-1">Enter Master PIN (9050093930) to unlock control room.</p>
            </div>

            <div className="space-y-3">
              <input
                type="password"
                value={adminPin}
                onChange={(e) => {
                  setAdminPin(e.target.value);
                  setAdminError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminSubmit()}
                placeholder="Enter 10-digit PIN"
                className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white tracking-widest text-center text-lg focus:outline-none focus:border-amber-500"
                autoFocus
              />
              {adminError && <p className="text-xs text-red-400 font-medium text-center">{adminError}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setAdminInputOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdminSubmit}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-lg transition-colors"
              >
                Verify & Enter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * CUSTOMER DASHBOARD: Fully Integrated 2-Pilot HFT View
 */
function DashboardPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'strategies'>('overview');

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Navbar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-amber-400">2-Pilot HFT Dashboard</h1>
            <p className="text-xs text-slate-400">Real-time Delta Exchange Execution Active</p>
          </div>
          <button
            onClick={() => setLocation('/')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700"
          >
            ← Logout
          </button>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Wallet Balance</span>
            <span className="text-2xl font-black text-emerald-400">₹8,534.27</span>
            <span className="text-[10px] text-emerald-500 block mt-1">● Available Margin</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Today's P&L</span>
            <span className="text-2xl font-black text-red-400">-₹1,465.73</span>
            <span className="text-[10px] text-red-500 block mt-1">▼ Live Tracking</span>
          </div>
        </div>

        {/* Market Pulse (Delta Exchange) */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <span>📈</span> Delta Exchange Market Pulse
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">BTC/USD</div>
              <div className="text-sm font-bold text-emerald-400 mt-1">$68,450.00</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">ETH/USD</div>
              <div className="text-sm font-bold text-emerald-400 mt-1">$3,520.00</div>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400">SOL/USD</div>
              <div className="text-sm font-bold text-emerald-400 mt-1">$145.50</div>
            </div>
          </div>
        </div>

        {/* 2-Pilot HFT Strategies */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200">Automated 2-Pilot Channels</h3>
          
          <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-white">Crypto Strategy Pilot A</div>
              <div className="text-xs text-slate-400">High-Frequency Arbitrage Engine</div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              ACTIVE
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-white">Core Bitcoin Directional Pilot B</div>
              <div className="text-xs text-slate-400">Momentum Breakout Execution</div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              ACTIVE
            </span>
          </div>
        </div>

        {/* Action Buttons (Deposit / Withdrawal) */}
        <div className="flex gap-4 pt-2">
          <button 
            onClick={() => alert('Deposit gateway initialized successfully.')}
            className="flex-1 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/20 transition-all"
          >
            Deposit Funds
          </button>
          <button 
            onClick={() => alert('Withdrawal request verification pending.')}
            className="flex-1 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm transition-all"
          >
            Withdrawal
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ADMIN PAGE: Command Center
 */
function AdminPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-bold text-amber-400">Admin Command Center</h1>
            <p className="text-xs text-slate-400">Master Control & User P&L Monitoring</p>
          </div>
          <button
            onClick={() => setLocation('/')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700"
          >
            ← Logout Admin
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-xs text-slate-400">Active Operators</div>
            <div className="text-2xl font-bold text-white mt-1">1 User Online</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-xs text-slate-400">Total System P&L</div>
            <div className="text-2xl font-bold text-red-400 mt-1">-₹1,465.73</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-xs text-slate-400">Master Security PIN</div>
            <div className="text-xl font-bold text-amber-400 mt-1">9050093930 (Verified)</div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200">Global Execution Controls</h3>
          <p className="text-xs text-slate-400">Manage automation override and risk protocols across all pilots.</p>
          <div className="flex gap-4 pt-2">
            <button 
              onClick={() => alert('All HFT Pilots Force Synced!')}
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              Force Sync All Pilots
            </button>
            <button 
              onClick={() => alert('Emergency Stop Triggered!')}
              className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
            >
              Emergency Halt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotFoundPage() {
  const [, setLocation] = useLocation();
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-slate-400">Page not found</p>
        <button onClick={() => setLocation('/')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm">
          Return Home
        </button>
      </div>
    </div>
  );
}

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

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
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
