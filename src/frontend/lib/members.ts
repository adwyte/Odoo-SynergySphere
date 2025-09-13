import { API } from "./api";

export type Member = {
  id: number;
  name?: string | null;
  email: string;
};

export async function listMembers(projectId: number, token: string) {
  const res = await fetch(`${API}/api/v1/projects/${projectId}/members`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as Member[];
}

export async function addMember(
  projectId: number,
  token: string,
  payload: { email: string }
) {
  const res = await fetch(`${API}/api/v1/projects/${projectId}/members`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}
