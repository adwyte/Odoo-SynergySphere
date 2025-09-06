"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { login as apiLogin, signup as apiSignup, me as apiMe } from "@/lib/auth";

type User = {
  id: string;        // keep string for your UI; we map from backend number
  name: string | null;
  email: string;
  avatar?: string | null;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  token: string | null; // expose token if you want to call authed APIs
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// localStorage keys
const LS_USER = "synergy-user";
const LS_TOKEN = "synergy-token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load: restore token, validate with /auth/me
  useEffect(() => {
    (async () => {
      try {
        const savedToken = localStorage.getItem(LS_TOKEN);
        if (savedToken) {
          const u = await apiMe(savedToken);
          const mapped: User = {
            id: String(u.id),
            name: u.name ?? null,
            email: u.email,
            avatar: u.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
          };
          setUser(mapped);
          setToken(savedToken);
          localStorage.setItem(LS_USER, JSON.stringify(mapped));
        } else {
          // fallback to legacy saved user (if any)
          const savedUser = localStorage.getItem(LS_USER);
          if (savedUser) setUser(JSON.parse(savedUser));
        }
      } catch {
        // invalid token; clear it
        localStorage.removeItem(LS_TOKEN);
        localStorage.removeItem(LS_USER);
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiLogin(email, password);
      const mapped: User = {
        id: String(res.user.id),
        name: res.user.name ?? null,
        email: res.user.email,
        avatar: res.user.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.user.email}`,
      };
      setUser(mapped);
      setToken(res.access_token);
      localStorage.setItem(LS_USER, JSON.stringify(mapped));
      localStorage.setItem(LS_TOKEN, res.access_token);
    } catch (err) {
      throw new Error(typeof err === "string" ? err : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      // create user
      await apiSignup(name, email, password);
      // auto-login
      const res = await apiLogin(email, password);
      const mapped: User = {
        id: String(res.user.id),
        name: res.user.name ?? null,
        email: res.user.email,
        avatar: res.user.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.user.email}`,
      };
      setUser(mapped);
      setToken(res.access_token);
      localStorage.setItem(LS_USER, JSON.stringify(mapped));
      localStorage.setItem(LS_TOKEN, res.access_token);
    } catch (err) {
      throw new Error(typeof err === "string" ? err : "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(LS_USER);
    localStorage.removeItem(LS_TOKEN);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
