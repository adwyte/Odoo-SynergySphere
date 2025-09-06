import { API } from "./api";

export type ProjectCard = {
  id: number;
  name: string;
  description: string;
  members: number;
  tasksCompleted: number;
  totalTasks: number;
  dueDate: string | null;
  status: "active" | "completed" | "overdue";
  color: string;
};

export async function listMyProjects(token: string): Promise<ProjectCard[]> {
  const res = await fetch(`${API}/api/v1/projects`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createProject(
  token: string,
  data: { name: string; description?: string; due_date?: string | null }
): Promise<ProjectCard> {
  const res = await fetch(`${API}/api/v1/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function joinProject(token: string, projectId: number) {
  const res = await fetch(`${API}/api/v1/projects/${projectId}/join`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) throw new Error(await res.text());
}
