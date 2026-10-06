import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api.ts';

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
    const savedToken = localStorage.getItem('classpulse_token');
    const savedUser = localStorage.getItem('classpulse_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Verify with /me
        authService
          .getMe()
          .then((res) => {
            if (res.data?.data?.user) {
              setUser(res.data.data.user);
              localStorage.setItem('classpulse_user', JSON.stringify(res.data.data.user));
            }
          })
          .catch(() => {
            // Token expired or invalid
            localStorage.removeItem('classpulse_token');
            localStorage.removeItem('classpulse_user');
            setUser(null);
            setToken(null);
          })
          .finally(() => {
            setLoading(false);
          });
        return;
      } catch (err) {
        localStorage.removeItem('classpulse_token');
        localStorage.removeItem('classpulse_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('classpulse_token', newToken);
    localStorage.setItem('classpulse_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('classpulse_token');
    localStorage.removeItem('classpulse_user');
    setToken(null);
    setUser(null);
    authService.logout().catch(() => {});
  };

  const updateUser = (updatedUser: User) => {
    localStorage.setItem('classpulse_user', JSON.stringify(updatedUser));
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
