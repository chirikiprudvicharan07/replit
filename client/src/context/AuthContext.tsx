import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api.ts';
import { supabase } from '../lib/supabase.ts';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const restoreApiSession = () => {
      authService
        .getMe()
        .then((res) => {
          if (res.data?.data?.user) setUser(res.data.data.user);
        })
        .catch(() => {
          setUser(null);
          setToken(null);
        })
        .finally(() => setLoading(false));
    };

    const supabaseClient = supabase;
    if (supabaseClient) {
      const { data: listener } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        if (!session?.access_token) {
          return;
        }
        try {
          const response = await authService.loginWithGoogle(session.access_token);
          if (response.data?.data) {
            login(response.data.data.token, response.data.data.user);
          }
        } catch {
          await supabaseClient.auth.signOut();
          restoreApiSession();
        } finally {
          setLoading(false);
        }
      });

      void supabaseClient.auth.getSession().then(({ data }) => {
        if (!data.session) {
          restoreApiSession();
        }
      });

      return () => listener.subscription.unsubscribe();
    }

    restoreApiSession();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    authService.logout().catch(() => {});
    void supabase?.auth.signOut();
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
