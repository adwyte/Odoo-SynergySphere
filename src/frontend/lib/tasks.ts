import { API } from "./api";

export type TaskCreate = {
  title: string;
  description?: string | null;
  assignee_id?: number | null;
  due_date?: string | null; // YYYY-MM-DD
  priority?: "low" | "medium" | "high";
  status?: "todo" | "in_progress" | "done";
};

export type TaskUpdate = {
  title?: string;
  description?: string | null;
  assignee_id?: number | null;
  due_date?: string | null;
  priority?: "low" | "medium" | "high";
  status?: "todo" | "in_progress" | "done";
};

export async function listTasks(projectId: number, token: string) {
  const res = await fetch(`${API}/api/v1/tasks/by-project/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createTask(projectId: number, token: string, body: TaskCreate) {
  const res = await fetch(`${API}/api/v1/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ project_id: projectId, ...body }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateTask(taskId: number, token: string, body: TaskUpdate) {
  const res = await fetch(`${API}/api/v1/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
