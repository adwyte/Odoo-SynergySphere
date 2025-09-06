import { API } from "./api"

export type Task = {
  id: number
  title: string
  description?: string | null
  assignee_id: number | null
  status: "todo" | "in_progress" | "done"
  priority: "low" | "medium" | "high"
  due_date: string | null
  created_at: string
}

export async function listTasks(projectId: number, token: string): Promise<Task[]> {
  const res = await fetch(`${API}/api/v1/tasks/by-project/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createTask(
  projectId: number,
  token: string,
  payload: {
    title: string
    description?: string
    assignee_id?: number | null
    priority?: "low" | "medium" | "high"
    due_date?: string | null
  }
) {
  const res = await fetch(`${API}/api/v1/tasks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: projectId, ...payload }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateTask(
  taskId: number,
  token: string,
  payload: Partial<{
    title: string
    description: string
    assignee_id: number | null
    status: "todo" | "in_progress" | "done"
    priority: "low" | "medium" | "high"
    due_date: string | null
  }>
) {
  const res = await fetch(`${API}/api/v1/tasks/${taskId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
