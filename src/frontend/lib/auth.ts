import { API } from "./api";

export type LoginResponse = {
  access_token: string;
  token_type: string; // "bearer"
  user: {
    id: number;
    email: string;
    name?: string | null;
    avatar_url?: string | null;
  };
};

export async function login(email: string, password: string): Promise<LoginResponse> {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function signup(name: string, email: string, password: string) {
  const res = await fetch(`${API}/api/v1/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ id: number; email: string; name?: string; avatar_url?: string }>;
}

export async function me(token: string) {
  const res = await fetch(`${API}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ id: number; email: string; name?: string; avatar_url?: string }>;
}
