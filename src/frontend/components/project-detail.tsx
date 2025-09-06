"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { ChevronLeft, CheckCircle, Send, Users } from "lucide-react"
import { API, getJSON } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"
import { listMembers, type Member } from "@/lib/members"
import {
  listTasks,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  type Task as ApiTask,
} from "@/lib/tasks"

type TaskStatusUI = "todo" | "in-progress" | "done"
type TaskPriorityUI = "low" | "medium" | "high"

export interface Project {
  id: string
  name: string
  description: string
  members: number
  tasksCompleted: number
  totalTasks: number
  dueDate: string | null
  status: "active" | "completed" | "overdue"
  color: string
}

interface TaskUI {
  id: number
  title: string
  description?: string
  assigneeId: number | null
  assigneeName: string
  assigneeAvatar?: string | null
  status: TaskStatusUI
  priority: TaskPriorityUI
  dueDate: string | null
}

interface Message {
  id: string
  author: string
  authorAvatar: string
  content: string
  timestamp: string
}

interface Leader {
  userId: number
  name: string
  avatar: string | null
  score: number
}

/** Helpers to map API status ⇄ UI status */
function apiToUiStatus(s: "todo" | "in_progress" | "done"): TaskStatusUI {
  return s === "in_progress" ? "in-progress" : s
}
function uiToApiStatus(s: TaskStatusUI): "todo" | "in_progress" | "done" {
  return s === "in-progress" ? "in_progress" : s
}

export default function ProjectDetail({
  project,
  onBack,
}: {
  project: Project
  onBack: () => void
}) {
  const { token } = useAuth()
  const pidNum = Number(project.id)

  const [activeTab, setActiveTab] = useState<string>("board")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tasks, setTasks] = useState<TaskUI[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [leaders, setLeaders] = useState<Leader[]>([])

  // new task draft
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newDue, setNewDue] = useState<string>("")
  const [newPriority, setNewPriority] = useState<TaskPriorityUI>("medium")
  const [newAssignee, setNewAssignee] = useState<number | "">("")
  const [postingTask, setPostingTask] = useState(false)

  // invite member
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)

  // chat draft
  const [msgText, setMsgText] = useState("")
  const [postingMsg, setPostingMsg] = useState(false)

  // ------- Load all (members, tasks, leaderboard, chat) & auto-join -------
  useEffect(() => {
    let cancelled = false

    async function loadInner() {
      if (!token) return
      const [mem, apiTasks, lb] = await Promise.all([
        listMembers(pidNum, token),
        listTasks(pidNum, token),
        fetch(`${API}/api/v1/analytics/leaderboard/${pidNum}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => (r.ok ? r.json() : [] as Leader[])),
      ])

      if (cancelled) return

      setMembers(mem || [])

      // build member map for name/avatar lookup
      const memMap = new Map<number, Member>()
      ;(mem || []).forEach((m) => memMap.set(m.id, m))

      const tUI: TaskUI[] = (apiTasks || []).map((t: ApiTask) => {
        const m = t.assignee_id ? memMap.get(t.assignee_id) : undefined
        return {
          id: t.id,
          title: t.title,
          description: t.description || "",
          assigneeId: t.assignee_id ?? null,
          assigneeName: m?.name || m?.email || "Unassigned",
          assigneeAvatar: m ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.email}` : null,
          status: apiToUiStatus(t.status),
          priority: t.priority,
          dueDate: t.due_date ?? null,
        }
      })
      setTasks(tUI)

      setLeaders((lb || []).map((x: any) => ({
        userId: Number(x.userId),
        name: x.name || "Member",
        avatar: x.avatar || null,
        score: Number(x.score || 0),
      })))

      // optional chat (ignore failures)
      try {
        const chat = await fetch(`${API}/api/v1/projects/${pidNum}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (chat.ok) {
          const m = await chat.json()
          setMessages(m || [])
        }
      } catch {}
    }

    async function loadAll() {
      if (!token) return
      setLoading(true); setError(null)
      try {
        await loadInner()
      } catch (err: any) {
        // If not a member, try to join and reload once
        if (typeof err?.message === "string" && err.message.toLowerCase().includes("not a member")) {
          try {
            await fetch(`${API}/api/v1/projects/${pidNum}/join`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            })
            await loadInner()
          } catch {
            if (!cancelled) setError("Failed to load project data (membership)")
          }
        } else if (!cancelled) {
          setError(err?.message || "Failed to load project data")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAll()
    return () => {
      cancelled = true
    }
  }, [pidNum, token])

  // ------- Derived columns -------
  const columns = useMemo(() => {
    return {
      todo: tasks.filter((t) => t.status === "todo"),
      inProgress: tasks.filter((t) => t.status === "in-progress"),
      done: tasks.filter((t) => t.status === "done"),
    }
  }, [tasks])

  // ------- Helpers -------
  const refreshTasks = async () => {
    if (!token) return
    const apiTasks = await listTasks(pidNum, token)
    const memMap = new Map<number, Member>()
    members.forEach((m) => memMap.set(m.id, m))
    const tUI: TaskUI[] = (apiTasks || []).map((t) => {
      const m = t.assignee_id ? memMap.get(t.assignee_id) : undefined
      return {
        id: t.id,
        title: t.title,
        description: t.description || "",
        assigneeId: t.assignee_id ?? null,
        assigneeName: m?.name || m?.email || "Unassigned",
        assigneeAvatar: m ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.email}` : null,
        status: apiToUiStatus(t.status),
        priority: t.priority,
        dueDate: t.due_date ?? null,
      }
    })
    setTasks(tUI)
  }

  const refreshLeaderboard = async () => {
    if (!token) return
    const res = await fetch(`${API}/api/v1/analytics/leaderboard/${pidNum}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (res.ok) {
      const lb = await res.json()
      setLeaders(
        (lb || []).map((x: any) => ({
          userId: Number(x.userId),
          name: x.name || "Member",
          avatar: x.avatar || null,
          score: Number(x.score || 0),
        }))
      )
    }
  }

  // ------- Actions -------
  const moveTask = async (taskId: number, newStatus: TaskStatusUI) => {
    try {
      if (!token) throw new Error("Not authenticated")
      await apiUpdateTask(taskId, token, { status: uiToApiStatus(newStatus) })
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))
      if (newStatus === "done") await refreshLeaderboard()
    } catch (e: any) {
      alert(e?.message || "Failed to update task")
    }
  }

  const changeAssignee = async (taskId: number, assigneeId: number | null) => {
    try {
      if (!token) throw new Error("Not authenticated")
      await apiUpdateTask(taskId, token, { assignee_id: assigneeId ?? 0 })
      // optimistic update
      const m = assigneeId ? members.find((x) => x.id === assigneeId) : undefined
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                assigneeId,
                assigneeName: m?.name || m?.email || "Unassigned",
                assigneeAvatar: m ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.email}` : null,
              }
            : t
        )
      )
    } catch (e: any) {
      alert(e?.message || "Failed to change assignee")
    }
  }

  const changePriority = async (taskId: number, priority: TaskPriorityUI) => {
    try {
      if (!token) throw new Error("Not authenticated")
      await apiUpdateTask(taskId, token, { priority })
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, priority } : t)))
    } catch (e: any) {
      alert(e?.message || "Failed to update priority")
    }
  }

  const markDoneToggle = async (taskId: number, checked: boolean) => {
    await moveTask(taskId, checked ? "done" : "todo")
  }

  const createTask = async () => {
    if (!newTitle.trim()) return
    try {
      if (!token) throw new Error("Not authenticated")
      setPostingTask(true)
      await apiCreateTask(pidNum, token, {
        title: newTitle.trim(),
        description: newDesc || "",
        assignee_id: newAssignee === "" ? null : Number(newAssignee),
        due_date: newDue || null, // "YYYY-MM-DD"
        priority: newPriority,
      })
      setNewTitle("")
      setNewDesc("")
      setNewDue("")
      setNewPriority("medium")
      setNewAssignee("")
      await refreshTasks()
    } catch (e: any) {
      alert(e?.message || "Failed to create task")
    } finally {
      setPostingTask(false)
    }
  }

  const inviteMember = async () => {
    const email = inviteEmail.trim()
    if (!email || !token) return
    setInviting(true)
    try {
      const res = await fetch(`${API}/api/v1/projects/${pidNum}/members`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error(await res.text())
      const mem = await listMembers(pidNum, token)
      setMembers(mem || [])
      setInviteEmail("")
    } catch (e: any) {
      alert(e?.message || "Failed to add member")
    } finally {
      setInviting(false)
    }
  }

  const sendMessage = async () => {
    const body = msgText.trim()
    if (!body || !token) return
    setPostingMsg(true)
    try {
      const res = await fetch(`${API}/api/v1/projects/${pidNum}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: body }),
      })
      if (!res.ok) throw new Error(await res.text())
      const m = await fetch(`${API}/api/v1/projects/${pidNum}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (m.ok) setMessages(await m.json())
      setMsgText("")
    } catch (e: any) {
      alert(e?.message || "Failed to send message")
    } finally {
      setPostingMsg(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* top bar */}
      <div className="border-b border-border bg-card">
        <div className="flex h-14 items-center px-4 gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <div className={`w-3 h-3 rounded-full ${project.color}`} />
          <h2 className="text-lg font-semibold">{project.name}</h2>
          <div className="ml-auto text-sm text-muted-foreground">{project.description}</div>
        </div>
      </div>

      <main className="p-4 md:p-6 space-y-6">
        {error && <div className="text-sm text-red-500">Error: {error}</div>}
        {loading && <div className="text-sm text-muted-foreground">Loading project…</div>}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          {/* BOARD */}
          <TabsContent value="board" className="mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* TODO */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold">To-Do</CardTitle>
                  <Badge variant="secondary">{columns.todo.length}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {columns.todo.map((t) => (
                    <TaskCard
                      key={t.id}
                      t={t}
                      members={members}
                      onMove={(s) => moveTask(t.id, s)}
                      onAssign={(id) => changeAssignee(t.id, id)}
                      onPriority={(p) => changePriority(t.id, p)}
                      onDone={(checked) => markDoneToggle(t.id, checked)}
                    />
                  ))}
                  {/* new task */}
                  <div className="space-y-2 border-t pt-3">
                    <Input placeholder="New task title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                    <Textarea placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                    <div className="grid md:grid-cols-3 grid-cols-1 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Assignee</label>
                        <select
                          className="w-full rounded-md border bg-background p-2 text-sm"
                          value={newAssignee}
                          onChange={(e) => setNewAssignee(e.target.value === "" ? "" : Number(e.target.value))}
                        >
                          <option value="">Unassigned</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name || m.email}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Due date</label>
                        <Input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Priority</label>
                        <select
                          className="w-full rounded-md border bg-background p-2 text-sm"
                          value={newPriority}
                          onChange={(e) => setNewPriority(e.target.value as TaskPriorityUI)}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>
                    <Button size="sm" onClick={createTask} disabled={postingTask}>
                      {postingTask ? "Adding…" : "Add Task"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* IN PROGRESS */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold">In Progress</CardTitle>
                  <Badge variant="secondary">{columns.inProgress.length}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {columns.inProgress.map((t) => (
                    <TaskCard
                      key={t.id}
                      t={t}
                      members={members}
                      onMove={(s) => moveTask(t.id, s)}
                      onAssign={(id) => changeAssignee(t.id, id)}
                      onPriority={(p) => changePriority(t.id, p)}
                      onDone={(checked) => markDoneToggle(t.id, checked)}
                    />
                  ))}
                </CardContent>
              </Card>

              {/* DONE */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Done</CardTitle>
                  <Badge variant="secondary">{columns.done.length}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {columns.done.map((t) => (
                    <TaskCard
                      key={t.id}
                      t={t}
                      members={members}
                      onMove={(s) => moveTask(t.id, s)}
                      onAssign={(id) => changeAssignee(t.id, id)}
                      onPriority={(p) => changePriority(t.id, p)}
                      onDone={(checked) => markDoneToggle(t.id, checked)}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* CHAT */}
          <TabsContent value="chat" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Project Chat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-[50vh] overflow-auto pr-2">
                  {messages.map((m) => (
                    <div key={m.id} className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.authorAvatar || "/placeholder.svg"} />
                        <AvatarFallback>{(m.author || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{m.author}</div>
                        <div className="text-sm text-muted-foreground">{new Date(m.timestamp).toLocaleString()}</div>
                        <div className="mt-1 text-sm">{m.content}</div>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && <div className="text-sm text-muted-foreground">No messages yet.</div>}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Write a message…" value={msgText} onChange={(e) => setMsgText(e.target.value)} />
                  <Button onClick={sendMessage} disabled={postingMsg}>
                    <Send className="h-4 w-4 mr-2" />
                    {postingMsg ? "Sending…" : "Send"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TEAM */}
          <TabsContent value="team" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Team Members</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Invite by email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Button onClick={inviteMember} disabled={inviting || !inviteEmail.trim()}>
                    {inviting ? "Adding…" : "Add"}
                  </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 border rounded-md p-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.email}`} />
                        <AvatarFallback>{(m.name || m.email || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{m.name || m.email}</div>
                        <div className="text-xs text-muted-foreground">{m.email}</div>
                        <div className="text-xs mt-1 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> {/* placeholder */} 0 done
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {/* placeholder */} 1 project
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary">Member</Badge>
                    </div>
                  ))}
                  {members.length === 0 && <div className="text-sm text-muted-foreground">No members yet.</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LEADERBOARD */}
          <TabsContent value="leaderboard" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Team Leaderboard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {leaders.length === 0 && <div className="text-sm text-muted-foreground">No activity yet.</div>}
                {leaders.map((l, idx) => (
                  <div key={l.userId} className="flex items-center gap-3 border rounded-md p-3">
                    <div className="w-6 text-sm font-semibold">{idx + 1}</div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={l.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{l.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                    <Badge>{l.score.toFixed(0)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function TaskCard({
  t,
  members,
  onMove,
  onAssign,
  onPriority,
  onDone,
}: {
  t: TaskUI
  members: Member[]
  onMove: (s: TaskStatusUI) => void
  onAssign: (assigneeId: number | null) => void
  onPriority: (p: TaskPriorityUI) => void
  onDone: (checked: boolean) => void
}) {
  return (
    <div className="border rounded-md p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={t.status === "done"}
              onChange={(e) => onDone(e.target.checked)}
              className="h-4 w-4 accent-primary"
              title="Mark done"
            />
            <div className="text-sm font-medium">{t.title}</div>
          </div>
          {t.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description}</div>}
          <div className="mt-1 text-xs text-muted-foreground">
            {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">Move</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onMove("todo")}>To-Do</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove("in-progress")}>In-Progress</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove("done")}>Done</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        {/* Priority */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">{t.priority}</Badge>
          <select
            className="border rounded-md h-7 px-2 bg-background text-xs"
            value={t.priority}
            onChange={(e) => onPriority(e.target.value as TaskPriorityUI)}
            title="Change priority"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* Assignee */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={t.assigneeAvatar || "/placeholder.svg"} />
            <AvatarFallback>{(t.assigneeName || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <select
            className="border rounded-md h-7 px-2 bg-background text-xs"
            value={t.assigneeId ?? ""}
            onChange={(e) => {
              const val = e.target.value
              onAssign(val === "" ? null : Number(val))
            }}
            title="Reassign"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.email}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
