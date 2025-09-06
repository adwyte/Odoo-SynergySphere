import { API } from "./api"

export type Member = { id: number; name: string | null; email: string; avatar?: string | null }

export async function listMembers(projectId: number, token: string): Promise<Member[]> {
  const res = await fetch(`${API}/api/v1/projects/${projectId}/members`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
