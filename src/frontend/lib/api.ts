// frontend/lib/api.ts
export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7000";

async function handle(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  // some endpoints may return 204
  if (res.status === 204) return undefined as any;
  return res.json();
}

export async function getJSON<T>(url: string, token?: string): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // IMPORTANT: don't send credentials unless you truly need cookies
    // credentials: "omit" is default
  });
  return handle(res);
}

export async function postJSON<T>(url: string, body: any, token?: string): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    // credentials: "omit"
  });
  return handle(res);
}

export async function patchJSON<T>(url: string, body: any, token?: string): Promise<T> {
  const res = await fetch(`${API}${url}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    // credentials: "omit"
  });
  return handle(res);
}
