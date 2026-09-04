import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { AlertTriangle, BarChart3, LogOut, TrendingDown, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface UserStat {
  id: string;
  mobile: string;
  balance: number;
  dayPnl: number;
  activeTrades: number;
  status: 'active' | 'idle' | 'paused';
}

interface RiskAlert {
  id: string;
  level: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
}

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<UserStat[]>([
    { id: '1', mobile: '9876543210', balance: 125000, dayPnl: 5234, activeTrades: 3, status: 'active' },
    { id: '2', mobile: '9765432109', balance: 89500, dayPnl: -2156, activeTrades: 1, status: 'active' },
    { id: '3', mobile: '9654321098', balance: 245000, dayPnl: 12890, activeTrades: 5, status: 'active' },
  ]);

  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([
    { id: '1', level: 'critical', message: 'User 9876543210 exceeded daily loss limit', timestamp: '2 minutes ago' },
    { id: '2', level: 'warning', message: 'BTC volatility spike - Risk adjustment recommended', timestamp: '15 minutes ago' },
    { id: '3', level: 'info', message: 'System maintenance scheduled for 2:00 AM', timestamp: '1 hour ago' },
  ]);

  const [dailyPnl, setDailyPnl] = useState({
    total: 28134,
    users: 3,
    trades: 18,
    winRate: 72.3,
  });

  const [emergencyMode, setEmergencyMode] = useState(false);

  useEffect(() => {
    // Verify admin is logged in
    const auth = localStorage.getItem('auth_token');
    if (!auth) {
      setLocation('/login');
      return;
    }
    try {
      const parsed = JSON.parse(auth);
      if (parsed.role !== 'admin') {
        setLocation('/login');
      }
    } catch {
      setLocation('/login');
    }
  }, [setLocation]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setLocation('/login');
  };

  const toggleEmergencyMode = () => {
    setEmergencyMode(!emergencyMode);
    // In production: send API request to pause all trading
  };

  const getRiskColor = (level: string) => {
    if (level === 'critical') return 'bg-red-900/20 border-red-700/50 text-red-200';
    if (level === 'warning') return 'bg-amber-900/20 border-amber-700/50 text-amber-200';
    return 'bg-blue-900/20 border-blue-700/50 text-blue-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0f19] to-[#161b22] p-4 sm:p-6">
      {/* Emergency Banner */}
      {emergencyMode && (
        <div className="mb-6 p-4 bg-red-900/20 border-2 border-red-700 rounded-lg animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="font-bold text-red-200">EMERGENCY MODE ACTIVE</p>
              <p className="text-xs text-red-300">All trading channels have been paused. Orders will not execute.</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Command Center</h1>
            <p className="text-sm text-muted-foreground mt-1">TradeCore Live - Master Control</p>
          </div>
          <Button
            onClick={handleLogout}
            className="bg-secondary hover:bg-secondary/90 text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border p-4">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-2">Daily P&L</p>
            <p className={`text-2xl font-bold ${dailyPnl.total >= 0 ? 'text-primary' : 'text-red-400'}`}>
              ₹{(dailyPnl.total / 1000).toFixed(1)}K
            </p>
            <p className="text-xs text-muted-foreground mt-1">{dailyPnl.users} users • {dailyPnl.trades} trades</p>
          </Card>
          <Card className="bg-card border-border p-4">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-2">Win Rate</p>
            <p className="text-2xl font-bold text-primary">{dailyPnl.winRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Across all users</p>
          </Card>
          <Card className="bg-card border-border p-4">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-2">Active Users</p>
            <p className="text-2xl font-bold text-primary">{users.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{users.filter(u => u.status === 'active').length} trading now</p>
          </Card>
          <Card className="bg-card border-border p-4">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-2">Risk Alerts</p>
            <p className="text-2xl font-bold text-red-400">{riskAlerts.filter(a => a.level === 'critical').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Requiring attention</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Tracking */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">User Tracking</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border">
                    <tr className="text-xs font-mono text-muted-foreground uppercase">
                      <th className="text-left py-2 px-3">Mobile</th>
                      <th className="text-right py-2 px-3">Balance</th>
                      <th className="text-right py-2 px-3">Day P&L</th>
                      <th className="text-right py-2 px-3">Trades</th>
                      <th className="text-center py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 px-3 font-mono text-xs">{user.mobile}</td>
                        <td className="py-3 px-3 text-right font-mono">₹{(user.balance / 1000).toFixed(0)}K</td>
                        <td className={`py-3 px-3 text-right font-mono ${user.dayPnl >= 0 ? 'text-primary' : 'text-red-400'}`}>
                          {user.dayPnl >= 0 ? '+' : ''}{(user.dayPnl / 1000).toFixed(1)}K
                        </td>
                        <td className="py-3 px-3 text-right">{user.activeTrades}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block px-2 py-1 rounded text-[10px] font-semibold ${user.status === 'active' ? 'bg-primary/20 text-primary' : user.status === 'idle' ? 'bg-secondary text-muted-foreground' : 'bg-yellow-900/20 text-yellow-200'}`}>
                            {user.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Emergency Risk Switches */}
          <div className="space-y-4">
            <Card className="bg-card border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-foreground">Risk Switches</h2>
              </div>
              <div className="space-y-3">
                <button
                  onClick={toggleEmergencyMode}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all border ${
                    emergencyMode
                      ? 'bg-red-900/40 border-red-700 text-red-200 hover:bg-red-900/50'
                      : 'bg-secondary/50 border-border text-foreground hover:bg-secondary/70'
                  }`}
                >
                  {emergencyMode ? '🛑 KILL SWITCH ACTIVE' : '⚠️ Activate Kill Switch'}
                </button>
                <p className="text-[10px] text-muted-foreground">Immediately pause all trading</p>
              </div>
            </Card>

            {/* Recent Alerts */}
            <Card className="bg-card border-border p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h2 className="text-lg font-semibold text-foreground">Risk Alerts</h2>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {riskAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border text-xs ${getRiskColor(alert.level)}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-semibold">{alert.message}</p>
                    </div>
                    <p className="text-[10px] opacity-75 mt-1">{alert.timestamp}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
