import { API } from "./api";

export type LeaderRow = {
  userId: number;
  name?: string | null;
  email?: string | null;
  score: number;
};

export async function getLeaderboard(projectId: number, token: string) {
  const res = await fetch(`${API}/api/v1/analytics/leaderboard/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as LeaderRow[];
}
