'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, getStoredUser, getStoredToken, storeAuth, clearAuth } from '@/lib/auth';
import api from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, phone: string, password: string) => Promise<{ success: boolean; redirectPath?: string; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const storedUser = getStoredUser();
      const storedToken = getStoredToken();

      if (storedUser && storedToken && session) {
        setUser(storedUser);
        setToken(storedToken);
      } else {
        clearAuth();
      }
      setLoading(false);
    };

    init();
  }, []);

  const login = async (email: string, phone: string, password: string) => {
    try {
      const response = await api.post('/auth/login', {
        email: email || undefined,
        phone: phone || undefined,
        password,
      });

      const { token: newToken, user: newUser, redirectPath } = response.data;
      
      storeAuth(newToken, newUser);
      setUser(newUser);
      setToken(newToken);

      return { success: true, redirectPath };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const logout = () => {
    void supabase.auth.signOut();
    clearAuth();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
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
