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
import { ChevronLeft, CheckCircle, Clock, MessageSquarePlus, Plus, Send, Users } from "lucide-react"
import { getJSON, postJSON, patchJSON } from "@/lib/api"
import { useAuth } from "@/components/auth-provider"

type TaskStatus = "todo" | "in-progress" | "done"
type TaskPriority = "low" | "medium" | "high"

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

interface Task {
  id: string
  title: string
  description?: string
  assignee: string
  assigneeAvatar: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  createdAt: string
  comments: number
  attachments: number
}

interface Message {
  id: string
  author: string
  authorAvatar: string
  content: string
  timestamp: string
  isReply?: boolean
  replyTo?: string | null
}

interface Member {
  id: string
  name: string
  email: string
  role: string
  status: "online" | "offline"
  tasksCompleted: number
  currentProjects: number
  avatar: string
}

interface Leader {
  userId: string
  name: string
  avatar: string
  score: number
}

export default function ProjectDetail({
  project,
  onBack,
}: {
  project: Project
  onBack: () => void
}) {
  const { user } = useAuth()
  const pid = project.id

  const [activeTab, setActiveTab] = useState<string>("board")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [tasks, setTasks] = useState<Task[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [leaders, setLeaders] = useState<Leader[]>([])

  // new task draft
  const [newTitle, setNewTitle] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [postingTask, setPostingTask] = useState(false)

  // new message draft
  const [msgText, setMsgText] = useState("")
  const [postingMsg, setPostingMsg] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      setLoading(true)
      setError(null)
      try {
        const [t, m, mem, lb] = await Promise.all([
          getJSON<Task[]>(`/api/v1/tasks/by-project/${pid}`),
          getJSON<Message[]>(`/api/v1/projects/${pid}/messages`),
          getJSON<Member[]>(`/api/v1/projects/${pid}/members`),
          getJSON<Leader[]>(`/api/v1/analytics/leaderboard/${pid}`),
        ])
        if (!cancelled) {
          setTasks(t || [])
          setMessages(m || [])
          setMembers(mem || [])
          setLeaders(lb || [])
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load project data")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadAll()
    return () => {
      cancelled = true
    }
  }, [pid])

  const columns = useMemo(() => {
    return {
      todo: tasks.filter((t) => t.status === "todo"),
      inProgress: tasks.filter((t) => t.status === "in-progress"),
      done: tasks.filter((t) => t.status === "done"),
    }
  }, [tasks])

  const moveTask = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await patchJSON(`/api/v1/tasks/${taskId}`, { status: newStatus })
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))
    } catch (e: any) {
      alert(e?.message || "Failed to update task")
    }
  }

  const createTask = async () => {
    if (!newTitle.trim()) return
    setPostingTask(true)
    try {
      const created = await postJSON<{ id: string; title: string; status: TaskStatus }>(`/api/v1/tasks`, {
        project_id: Number(pid),
        title: newTitle,
        description: newDesc || "",
        priority: "medium",
        created_by_id: 1, // optional until auth
      })
      // reload tasks
      const t = await getJSON<Task[]>(`/api/v1/tasks/by-project/${pid}`)
      setTasks(t || [])
      setNewTitle("")
      setNewDesc("")
    } catch (e: any) {
      alert(e?.message || "Failed to create task")
    } finally {
      setPostingTask(false)
    }
  }

  const sendMessage = async () => {
    const body = msgText.trim()
    if (!body) return
    setPostingMsg(true)
    try {
      await postJSON(`/api/v1/projects/${pid}/messages`, {
        content: body,
        author_id: 1, // optional until auth
      })
      const m = await getJSON<Message[]>(`/api/v1/projects/${pid}/messages`)
      setMessages(m || [])
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
                    <TaskCard key={t.id} t={t} onMove={(s) => moveTask(t.id, s)} />
                  ))}
                  {/* new task */}
                  <div className="space-y-2 border-t pt-3">
                    <Input placeholder="New task title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                    <Textarea placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
                    <Button size="sm" onClick={createTask} disabled={postingTask}>
                      <Plus className="h-4 w-4 mr-2" />
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
                    <TaskCard key={t.id} t={t} onMove={(s) => moveTask(t.id, s)} />
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
                    <TaskCard key={t.id} t={t} onMove={(s) => moveTask(t.id, s)} />
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
                        <AvatarFallback>{(m.author || "?").slice(0,1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{m.author}</div>
                        <div className="text-sm text-muted-foreground">{new Date(m.timestamp).toLocaleString()}</div>
                        <div className="mt-1 text-sm">{m.content}</div>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-sm text-muted-foreground">No messages yet.</div>
                  )}
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
              <CardContent className="grid gap-3 md:grid-cols-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 border rounded-md p-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={m.avatar || "/placeholder.svg"} />
                      <AvatarFallback>{m.name.slice(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                      <div className="text-xs mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {m.tasksCompleted} done</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {m.currentProjects} project</span>
                      </div>
                    </div>
                    <Badge variant={m.status === "online" ? "default" : "secondary"}>{m.status}</Badge>
                  </div>
                ))}
                {members.length === 0 && (
                  <div className="text-sm text-muted-foreground">No members yet.</div>
                )}
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
                      <AvatarFallback>{l.name.slice(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                    <Badge>{l.score.toFixed(1)}</Badge>
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

function TaskCard({ t, onMove }: { t: Task; onMove: (s: TaskStatus) => void }) {
  return (
    <div className="border rounded-md p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{t.title}</div>
          {t.description && <div className="text-xs text-muted-foreground line-clamp-2">{t.description}</div>}
          <div className="mt-1 text-xs text-muted-foreground">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</div>
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
      <div className="mt-3 flex items-center justify-between">
        <Badge variant="secondary" className="capitalize">{t.priority}</Badge>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={t.assigneeAvatar || "/placeholder.svg"} />
            <AvatarFallback>{t.assignee.slice(0,1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-xs">{t.assignee}</span>
        </div>
      </div>
    </div>
  )
}
