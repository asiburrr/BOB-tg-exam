"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "Administration" | "Admin" | string;
  status: string;
  permissions: string[];
  last_login_at?: string;
  last_login_ip?: string;
}

export interface AdminSession {
  id: string;
  ip_address: string;
  browser_name: string;
  browser_version: string;
  device_type: string;
  os_name: string;
  created_at: string;
  expires_at: string;
}

interface AuthContextType {
  admin: AdminUser | null;
  session: AdminSession | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (name: string, email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuth = () => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setAdmin(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    const savedToken = localStorage.getItem("auth_token");
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const res: any = await api.get("/auth/me");
      if (res?.success && res.data) {
        setAdmin(res.data.admin);
        setSession(res.data.current_session);
        setToken(savedToken);
      } else {
        clearAuth();
      }
    } catch {
      clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (email: string, password: string) => {
    const res: any = await api.post("/auth/login", { email, password });
    if (res?.success && res.data) {
      const newToken = res.data.token;
      localStorage.setItem("auth_token", newToken);
      setToken(newToken);
      setAdmin(res.data.admin);
      setSession(res.data.session);
      router.push("/admin");
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
    } finally {
      clearAuth();
      router.push("/admin/login");
    }
  };

  const updateProfile = async (name: string, email: string) => {
    const res: any = await api.put("/auth/me", { name, email });
    if (res?.success && res.data) {
      setAdmin(res.data.admin);
      if (res.data.current_session) {
        setSession(res.data.current_session);
      }
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await api.post("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        session,
        token,
        isLoading,
        isAuthenticated: !!admin,
        login,
        logout,
        refreshProfile,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
