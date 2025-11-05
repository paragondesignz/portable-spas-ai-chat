import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SessionResponse {
  authenticated: boolean;
  error?: string;
}

export function useAdminAuth() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkSession = useCallback(async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/admin/auth/session', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        setIsAuthenticated(false);
        return;
      }

      const data = (await response.json()) as SessionResponse;
      setIsAuthenticated(Boolean(data.authenticated));
    } catch (error) {
      console.error('Failed to verify admin session:', error);
      setIsAuthenticated(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to logout admin session:', error);
    } finally {
      setIsAuthenticated(false);
      router.push('/admin');
    }
  }, [router]);

  return {
    isAuthenticated,
    isChecking,
    handleLogout,
    refreshSession: checkSession,
  };
}
