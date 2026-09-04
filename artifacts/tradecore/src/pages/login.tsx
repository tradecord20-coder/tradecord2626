import { useState } from 'react';
import { useLocation } from 'wouter';
import { Lock, Phone, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

type LoginMode = 'choice' | 'customer' | 'admin';

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<LoginMode>('choice');
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const ADMIN_PHONE = '9050093930';
  const ADMIN_PIN = '1234'; // In production, use secure backend validation

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!mobile || !pin) {
        setError('Please enter mobile number and PIN');
        return;
      }
      if (mobile.length < 10) {
        setError('Mobile number must be at least 10 digits');
        return;
      }
      if (pin.length < 4) {
        setError('PIN must be at least 4 digits');
        return;
      }

      // Mock authentication - in production, call your backend API
      const mockAuth = await new Promise((resolve) => {
        setTimeout(() => resolve({ success: true, role: 'customer', mobile }), 500);
      });

      if (mockAuth) {
        localStorage.setItem('auth_token', JSON.stringify({ mobile, role: 'customer', timestamp: Date.now() }));
        setLocation('/dashboard');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!adminPhone || !adminPin) {
        setError('Please enter phone number and PIN');
        return;
      }
      if (adminPhone !== ADMIN_PHONE) {
        setError('Invalid admin credentials');
        return;
      }
      if (adminPin !== ADMIN_PIN) {
        setError('Invalid admin credentials');
        return;
      }

      // Mock authentication
      const mockAuth = await new Promise((resolve) => {
        setTimeout(() => resolve({ success: true, role: 'admin' }), 500);
      });

      if (mockAuth) {
        localStorage.setItem('auth_token', JSON.stringify({ role: 'admin', phone: ADMIN_PHONE, timestamp: Date.now() }));
        setLocation('/admin');
      }
    } catch (err) {
      setError('Admin login failed. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b0f19] to-[#161b22] p-4">
      <Card className="w-full max-w-md border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-8 pb-6 text-center border-b border-border">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">TradeCore Live</h1>
          <p className="text-xs text-muted-foreground mt-1">Guarded trading operations</p>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          {/* Mode Selection */}
          {mode === 'choice' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center mb-6">Select your login type</p>
              <Button
                onClick={() => { setMode('customer'); setError(''); }}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 text-base"
              >
                Customer Login
              </Button>
              <Button
                onClick={() => { setMode('admin'); setError(''); }}
                className="w-full bg-secondary hover:bg-secondary/90 text-foreground font-semibold h-12 text-base"
              >
                Admin Login
              </Button>
            </div>
          )}

          {/* Customer Login */}
          {mode === 'customer' && (
            <form onSubmit={handleCustomerLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  Mobile Number
                </label>
                <Input
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 15))}
                  className="w-full bg-secondary/50 border-border focus:border-primary"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  PIN
                </label>
                <Input
                  type="password"
                  placeholder="Enter your 4-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="w-full bg-secondary/50 border-border focus:border-primary"
                  disabled={isLoading}
                />
              </div>
              {error && <div className="text-xs text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20">{error}</div>}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11"
                disabled={isLoading}
              >
                {isLoading ? 'Authenticating...' : 'Login to Dashboard'}
              </Button>
              <Button
                type="button"
                onClick={() => { setMode('choice'); setMobile(''); setPin(''); setError(''); }}
                className="w-full bg-transparent hover:bg-secondary/50 text-muted-foreground border border-border font-semibold h-11"
              >
                Back
              </Button>
            </form>
          )}

          {/* Admin Login */}
          {mode === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="bg-amber-900/20 border border-amber-900/30 p-3 rounded-lg mb-4">
                <p className="text-xs text-amber-200 flex items-center gap-2">
                  <Lock className="w-3 h-3" />
                  Admin authentication required
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  Admin Phone
                </label>
                <Input
                  type="tel"
                  placeholder="Enter admin phone"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
                  className="w-full bg-secondary/50 border-border focus:border-primary"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  Admin PIN
                </label>
                <Input
                  type="password"
                  placeholder="Enter admin PIN"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="w-full bg-secondary/50 border-border focus:border-primary"
                  disabled={isLoading}
                />
              </div>
              {error && <div className="text-xs text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20">{error}</div>}
              <Button
                type="submit"
                className="w-full bg-secondary hover:bg-secondary/90 text-foreground font-semibold h-11"
                disabled={isLoading}
              >
                {isLoading ? 'Authenticating...' : 'Access Admin Panel'}
              </Button>
              <Button
                type="button"
                onClick={() => { setMode('choice'); setAdminPhone(''); setAdminPin(''); setError(''); }}
                className="w-full bg-transparent hover:bg-secondary/50 text-muted-foreground border border-border font-semibold h-11"
              >
                Back
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-secondary/30">
          <p className="text-[10px] text-muted-foreground text-center">
            Secure enterprise trading platform • v1.0
          </p>
        </div>
      </Card>
    </div>
  );
}
