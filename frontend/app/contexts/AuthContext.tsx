'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { username: string; email: string } | null;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  isFirstLogin: boolean;
  setIsFirstLogin: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [user, setUser] = useState<{ username: string; email: string } | null>(null);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = async () => {
    // Don't check auth if we're in the middle of logging out
    if (isLoggingOut) {
      console.log('🔐 [AuthContext] Skipping checkAuth during logout');
      return;
    }
    
    // Only show loading screen if check takes longer than 200ms
    const loadingTimer = setTimeout(() => {
      setShowLoadingScreen(true);
    }, 200);
    
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
          
          // Check if this is first login (only show welcome once)
          const hasSeenWelcome = localStorage.getItem('has_completed_welcome');
          if (!hasSeenWelcome && data.email) {
            setIsFirstLogin(true);
          }
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
      clearTimeout(loadingTimer);
      setIsLoading(false);
      setShowLoadingScreen(false);
    }
  };

  const logout = async () => {
    console.log('🔐 [AuthContext] Logout initiated');
    
    // Set logging out flag to prevent checkAuth from running
    setIsLoggingOut(true);
    
    // Clear local state immediately to prevent UI from showing logged-in state
    setIsAuthenticated(false);
    setUser(null);
    setIsFirstLogin(false);
    
    // Clear any stored flags
    localStorage.removeItem('has_completed_welcome');
    localStorage.removeItem('gmail_default_connection');
    
    // Call backend logout (but don't wait for it - redirect immediately)
    fetch('https://localhost:8000/api/auth/logout/', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      },
    }).catch((error) => {
      console.error('❌ [AuthContext] Logout backend call failed (but continuing with redirect):', error);
    });
    
    // Redirect immediately to login page
    console.log('🔄 [AuthContext] Redirecting to /login immediately');
    window.location.href = '/login';
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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== '/login') {
      console.log('🔐 [AuthContext] Not authenticated, redirecting to /login');
      // Use window.location for immediate redirect (faster than router.push)
      window.location.href = '/login';
    }
  }, [isAuthenticated, isLoading, pathname]);

  // BLOCK rendering if showing loading screen (only after 300ms delay)
  if (showLoadingScreen) {
    return (
      <AuthContext.Provider
        value={{
          isAuthenticated,
          isLoading,
          user,
          logout,
          checkAuth,
          isFirstLogin,
          setIsFirstLogin,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#1A1B1E' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '16px' }}>🔐</div>
            <div style={{ color: '#C1C2C5' }}>Checking authentication...</div>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  // If not authenticated and not on login page, don't render (will redirect)
  if (!isLoading && !isAuthenticated && pathname !== '/login') {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        logout,
        checkAuth,
        isFirstLogin,
        setIsFirstLogin,
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
