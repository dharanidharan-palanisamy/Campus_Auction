'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  fullName: string;
  campusAlias: string;
  studentId: string;
  role: 'STUDENT' | 'ADMIN';
  department?: string;
  college?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  verificationStatus?: string;
  trustScore?: number;
  trustTier?: string;
}

interface AuthContextType {
  // Client (Student) Session
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  register: (payload: { email: string; password: string; fullName: string; campusAlias: string; studentId: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  setUserDirectly: (user: User | null, token: string | null) => void;

  // Control Center (Admin) Session
  adminUser: User | null;
  adminToken: string | null;
  isAdminLoading: boolean;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  adminLogout: () => void;
  setAdminUserDirectly: (user: User | null, token: string | null) => void;
}

import { API_BASE } from '@/lib/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('campus_admin_token') || localStorage.getItem('campus_token');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Student State (strictly for Client Marketplace)
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Admin State (strictly for Admin Control Center)
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(true);

  useEffect(() => {
    // 1. One-time migration: If legacy admin credentials were stored in campus_user/campus_token,
    // move them to campus_admin_* so client panel is not polluted.
    const legacyToken = localStorage.getItem('campus_token');
    const legacyUser = localStorage.getItem('campus_user');

    if (legacyUser) {
      try {
        const parsed = JSON.parse(legacyUser);
        if (parsed.role === 'ADMIN') {
          if (!localStorage.getItem('campus_admin_token') && legacyToken) {
            localStorage.setItem('campus_admin_token', legacyToken);
          }
          if (!localStorage.getItem('campus_admin_user')) {
            localStorage.setItem('campus_admin_user', legacyUser);
          }
          localStorage.removeItem('campus_token');
          localStorage.removeItem('campus_user');
        }
      } catch {
        localStorage.removeItem('campus_user');
      }
    }

    // 2. Validate Client (Student) Session
    const savedStudentToken = localStorage.getItem('campus_token');
    const savedStudentUser = localStorage.getItem('campus_user');

    if (savedStudentToken && savedStudentUser) {
      try {
        const parsed = JSON.parse(savedStudentUser);
        if (parsed.role === 'STUDENT') {
          setToken(savedStudentToken);
          setUser(parsed);

          fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${savedStudentToken}` }
          })
            .then(res => res.json())
            .then(data => {
              if (data.success && data.user && data.user.role === 'STUDENT') {
                setUser(data.user);
                localStorage.setItem('campus_user', JSON.stringify(data.user));
              } else {
                setUser(null);
                setToken(null);
                localStorage.removeItem('campus_token');
                localStorage.removeItem('campus_user');
              }
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
        } else {
          setUser(null);
          setToken(null);
          localStorage.removeItem('campus_token');
          localStorage.removeItem('campus_user');
          setIsLoading(false);
        }
      } catch {
        localStorage.removeItem('campus_token');
        localStorage.removeItem('campus_user');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }

    // 3. Validate Admin Session
    const savedAdminToken = localStorage.getItem('campus_admin_token');
    const savedAdminUser = localStorage.getItem('campus_admin_user');

    if (savedAdminToken && savedAdminUser) {
      try {
        const parsed = JSON.parse(savedAdminUser);
        if (parsed.role === 'ADMIN') {
          setAdminToken(savedAdminToken);
          setAdminUser(parsed);

          fetch(`${API_BASE}/admin/auth/me`, {
            headers: { Authorization: `Bearer ${savedAdminToken}` }
          })
            .then(res => res.json())
            .then(data => {
              if (data.success && data.user && data.user.role === 'ADMIN') {
                setAdminUser(data.user);
                localStorage.setItem('campus_admin_user', JSON.stringify(data.user));
              } else {
                setAdminUser(null);
                setAdminToken(null);
                localStorage.removeItem('campus_admin_token');
                localStorage.removeItem('campus_admin_user');
              }
            })
            .catch(() => {})
            .finally(() => setIsAdminLoading(false));
        } else {
          setAdminUser(null);
          setAdminToken(null);
          localStorage.removeItem('campus_admin_token');
          localStorage.removeItem('campus_admin_user');
          setIsAdminLoading(false);
        }
      } catch {
        localStorage.removeItem('campus_admin_token');
        localStorage.removeItem('campus_admin_user');
        setIsAdminLoading(false);
      }
    } else {
      setIsAdminLoading(false);
    }
  }, []);

  // Student Authentication Handlers
  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('campus_token', data.token);
        localStorage.setItem('campus_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message || 'Login failed' };
    } catch (err: any) {
      const isNetworkFail = err?.name === 'TypeError' || err?.message?.includes('fetch') || err?.message?.includes('NetworkError');
      const msg = isNetworkFail
        ? 'Cannot reach backend server. Please verify your backend API is deployed and NEXT_PUBLIC_API_URL is configured.'
        : err.message || 'Network error';
      return { success: false, message: msg };
    }
  };

  const register = async (payload: { email: string; password: string; fullName: string; campusAlias: string; studentId: string }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('campus_token', data.token);
        localStorage.setItem('campus_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message || 'Registration failed' };
    } catch (err: any) {
      const isNetworkFail = err?.name === 'TypeError' || err?.message?.includes('fetch') || err?.message?.includes('NetworkError');
      const msg = isNetworkFail
        ? 'Cannot reach backend server. Please verify your backend API is deployed and NEXT_PUBLIC_API_URL is configured.'
        : err.message || 'Network error';
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('campus_token');
    localStorage.removeItem('campus_user');
    fetch(`${API_BASE}/auth/logout`, { method: 'POST' }).catch(() => {});
  };

  const setUserDirectly = (newUser: User | null, newToken: string | null) => {
    setUser(newUser);
    setToken(newToken);
    if (newUser && newToken) {
      localStorage.setItem('campus_token', newToken);
      localStorage.setItem('campus_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('campus_token');
      localStorage.removeItem('campus_user');
    }
  };

  // Administrator Authentication Handlers (Completely Isolated from Client Marketplace)
  const adminLogin = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminUser(data.user);
        setAdminToken(data.token);
        localStorage.setItem('campus_admin_token', data.token);
        localStorage.setItem('campus_admin_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message || 'Admin login failed' };
    } catch (err: any) {
      const isNetworkFail = err?.name === 'TypeError' || err?.message?.includes('fetch') || err?.message?.includes('NetworkError');
      const msg = isNetworkFail
        ? 'Cannot reach backend server. Please verify your backend API is deployed and NEXT_PUBLIC_API_URL is configured.'
        : err.message || 'Network error';
      return { success: false, message: msg };
    }
  };

  const adminLogout = () => {
    setAdminUser(null);
    setAdminToken(null);
    localStorage.removeItem('campus_admin_token');
    localStorage.removeItem('campus_admin_user');
    fetch(`${API_BASE}/admin/auth/logout`, { method: 'POST' }).catch(() => {});
  };

  const setAdminUserDirectly = (newAdmin: User | null, newToken: string | null) => {
    setAdminUser(newAdmin);
    setAdminToken(newToken);
    if (newAdmin && newToken) {
      localStorage.setItem('campus_admin_token', newToken);
      localStorage.setItem('campus_admin_user', JSON.stringify(newAdmin));
    } else {
      localStorage.removeItem('campus_admin_token');
      localStorage.removeItem('campus_admin_user');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        setUserDirectly,
        adminUser,
        adminToken,
        isAdminLoading,
        adminLogin,
        adminLogout,
        setAdminUserDirectly,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
