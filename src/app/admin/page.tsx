'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, Lock, RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/hooks/use-admin-auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const { isAuthenticated, isChecking, refreshSession } = useAdminAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isChecking && isAuthenticated) {
      router.push('/admin/dashboard');
    }
  }, [isAuthenticated, isChecking, router]);

  const handleLogin = async () => {
    setError('');

    if (!password) {
      setError('Please enter a password');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Invalid password');
      }

      setPassword('');
      await refreshSession();
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Unable to login');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
          <Lock className="h-12 w-12 text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          <p className="text-sm text-gray-600 mt-2">Portable Spas AI Assistant</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handleLogin()}
              placeholder="Enter admin password"
              className="w-full"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleLogin}
            className="w-full"
            disabled={!password || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Login'
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Ensure <code className="font-mono">ADMIN_PASSWORD</code> and <code className="font-mono">ADMIN_SESSION_SECRET</code> are set in your environment.
          </p>
        </div>
      </Card>
    </div>
  );
}
