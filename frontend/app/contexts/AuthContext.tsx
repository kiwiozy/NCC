'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { username: string; email: string } | null;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = async () => {
    try {
      const response = await fetch('https://localhost:8000/api/auth/user/', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          setUser({
            username: data.username || data.email || 'User',
            email: data.email || '',
          });
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } else if (response.status === 401) {
        setIsAuthenticated(false);
        setUser(null);
      } else {
        console.warn('⚠️ [AuthContext] Auth check returned unexpected status:', response.status);
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('❌ [AuthContext] Auth check failed:', error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // Clear local state immediately to prevent UI from showing logged-in state
    setIsAuthenticated(false);
    setUser(null);
    
    try {
      const response = await fetch('https://localhost:8000/api/auth/logout/', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // If backend returns a redirect URL, use it
        if (data.location) {
          window.location.href = data.location;
          return;
        }
      } else {
        console.warn('⚠️ [AuthContext] Logout response not OK:', response.status);
      }
    } catch (error) {
      console.error('❌ [AuthContext] Logout failed:', error);
    }
    
    // Always redirect to login, even if logout request fails
    // Use a small delay to ensure session is cleared on backend
    setTimeout(() => {
      window.location.href = '/login';
    }, 200);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Check auth when pathname changes (e.g., after OAuth callback)
  // But skip check on login page to prevent re-authentication after logout
  useEffect(() => {
    if (pathname && pathname !== '/login') {
      // Add a small delay to ensure logout completes before checking auth
      const timer = setTimeout(() => {
        checkAuth();
      }, 300);
      return () => {
        clearTimeout(timer);
      };
    } else if (pathname === '/login') {
      // On login page, explicitly check auth status
      // This will set isAuthenticated to false if user is logged out
      const timer = setTimeout(() => {
        checkAuth();
      }, 500);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [pathname]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
