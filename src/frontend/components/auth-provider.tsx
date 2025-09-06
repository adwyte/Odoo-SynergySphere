"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { login as apiLogin, signup as apiSignup, me as apiMe } from "@/lib/auth";

type User = {
  id: string;
  name: string | null;
  email: string;
  avatar?: string | null; // not used visually; we render initials
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LS_USER = "synergy-user";
const LS_TOKEN = "synergy-token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // initial restore
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const savedToken = localStorage.getItem(LS_TOKEN);
        if (savedToken) {
          const u = await apiMe(savedToken);
          if (cancelled) return;
          const mapped: User = {
            id: String(u.id),
            name: u.name ?? null,
            email: u.email,
            avatar: null,
          };
          setToken(savedToken);
          setUser(mapped);
          localStorage.setItem(LS_USER, JSON.stringify(mapped));
        } else {
          const savedUser = localStorage.getItem(LS_USER);
          if (savedUser) setUser(JSON.parse(savedUser));
        }
      } catch {
        localStorage.removeItem(LS_TOKEN);
        localStorage.removeItem(LS_USER);
        setUser(null);
        setToken(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiLogin(email, password);
      const mapped: User = {
        id: String(res.user.id),
        name: res.user.name ?? null,
        email: res.user.email,
        avatar: null,
      };
      setUser(mapped);
      setToken(res.access_token);
      localStorage.setItem(LS_USER, JSON.stringify(mapped));
      localStorage.setItem(LS_TOKEN, res.access_token);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      await apiSignup(name, email, password);
      const res = await apiLogin(email, password);
      const mapped: User = {
        id: String(res.user.id),
        name: res.user.name ?? null,
        email: res.user.email,
        avatar: null,
      };
      setUser(mapped);
      setToken(res.access_token);
      localStorage.setItem(LS_USER, JSON.stringify(mapped));
      localStorage.setItem(LS_TOKEN, res.access_token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem(LS_USER);
      localStorage.removeItem(LS_TOKEN);
    } finally {
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
