"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      // Check localStorage first (for client-side state)
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      const role = localStorage.getItem('role');

      if (!token || !userId) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // Validate token format
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          // Invalid token format
          logout();
          return;
        }

        // Check if token is expired
        try {
          const payload = JSON.parse(atob(tokenParts[1]));
          const currentTime = Date.now() / 1000;
          
          if (payload.exp && payload.exp < currentTime) {
            // Token expired
            logout();
            return;
          }

          // Token is valid
          setIsAuthenticated(true);
          setUser({ id: userId, role: payload.role || role });
        } catch (error) {
          // Invalid token
          logout();
          return;
        }
      } catch (error) {
        logout();
        return;
      }

      setIsLoading(false);
    };

    checkAuth();

    // Set up periodic token check (every 5 minutes)
    const interval = setInterval(checkAuth, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const logout = async () => {
    try {
      // Call logout API to clear server-side cookies
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout API error:', error);
    }
    
    // Clear client-side storage
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    
    setIsAuthenticated(false);
    setUser(null);
    router.push('/');
  };

  const login = (token, userId, role) => {
    // Store in localStorage for client-side access
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('role', role);
    
    setIsAuthenticated(true);
    setUser({ id: userId, role });
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout
  };
}
