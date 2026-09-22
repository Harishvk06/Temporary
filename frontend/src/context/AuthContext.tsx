import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authApi } from '../api/auth';
import { useProjectStore } from '../store/useProjectStore';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  requestOtp: (email: string, pass: string) => Promise<{ status: string; message: string; dev_otp?: string }>;
  verifyOtp: (email: string, otpCode: string) => Promise<void>;
  register: (email: string, pass: string, fullName?: string) => Promise<void>;
  logout: () => void;
  updateUserCredits: (newCredits: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('aura_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('aura_token') || null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    return !!localStorage.getItem('aura_token');
  });

  useEffect(() => {
    let isMounted = true;
    if (token) {
      setIsLoading(true);
      authApi.getProfile()
        .then((profile) => {
          if (isMounted) {
            setUser(profile);
            localStorage.setItem('aura_user', JSON.stringify(profile));
          }
        })
        .catch(() => {
          if (isMounted) {
            // Token is invalid or expired - log out
            setUser(null);
            setToken(null);
            localStorage.removeItem('aura_token');
            localStorage.removeItem('aura_user');
            useProjectStore.getState().resetProjects();
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    } else {
      setIsLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password: pass });
      setToken(res.access_token);
      localStorage.setItem('aura_token', res.access_token);
      
      const profile = await authApi.getProfile();
      setUser(profile);
      localStorage.setItem('aura_user', JSON.stringify(profile));
      useProjectStore.getState().loadUserProjects(profile.id);
    } catch (err) {
      setUser(null);
      setToken(null);
      localStorage.removeItem('aura_token');
      localStorage.removeItem('aura_user');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const requestOtp = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.sendOtp({ email, password: pass });
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (email: string, otpCode: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.verifyOtp({ email, otp_code: otpCode });
      setToken(res.access_token);
      localStorage.setItem('aura_token', res.access_token);
      
      const profile = await authApi.getProfile();
      setUser(profile);
      localStorage.setItem('aura_user', JSON.stringify(profile));
      useProjectStore.getState().loadUserProjects(profile.id);
    } catch (err) {
      setUser(null);
      setToken(null);
      localStorage.removeItem('aura_token');
      localStorage.removeItem('aura_user');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, pass: string, fullName?: string) => {
    setIsLoading(true);
    try {
      await authApi.register({ email, password: pass, full_name: fullName });
      const res = await authApi.login({ email, password: pass });
      setToken(res.access_token);
      localStorage.setItem('aura_token', res.access_token);
      
      const profile = await authApi.getProfile();
      setUser(profile);
      localStorage.setItem('aura_user', JSON.stringify(profile));
      useProjectStore.getState().loadUserProjects(profile.id);
    } catch (err) {
      setUser(null);
      setToken(null);
      localStorage.removeItem('aura_token');
      localStorage.removeItem('aura_user');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('aura_token');
    localStorage.removeItem('aura_user');
    useProjectStore.getState().resetProjects();
  };

  const updateUserCredits = (newCredits: number) => {
    if (user) {
      const updated = { ...user, credits_remaining: newCredits };
      setUser(updated);
      localStorage.setItem('aura_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isLoading, login, requestOtp, verifyOtp, register, logout, updateUserCredits }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
