"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronLeft, CheckCircle, Send, Settings2 } from "lucide-react";
import { getJSON, postJSON, API } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { listMembers, type Member } from "@/lib/members";
import {
  listTasks,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
} from "@/lib/tasks";

/* ===================== Types ===================== */

type TaskStatusUI = "todo" | "in-progress" | "done";
type TaskPriorityUI = "low" | "medium" | "high";

export interface Project {
  id: string;
  name: string;
  description: string;
  members: number;
  tasksCompleted: number;
  totalTasks: number;
  dueDate: string | null;
  status: "active" | "completed" | "overdue";
  color: string;
}

interface TaskUI {
  id: number;
  title: string;
  description?: string;
  assigneeId: number | null;
  assigneeName: string;
  status: TaskStatusUI;
  priority: TaskPriorityUI;
  dueDate: string | null;
}

interface Message {
  id: number;
  author: string;
  content: string;
  timestamp: string;
}

/** Unified Leader type for UI */
interface Leader {
  userId: number;
  name: string;
  score: number;
}

/** Possible backend row (we’ll map this to Leader) */
interface LeaderRow {
  user_id: number;
  name?: string | null;
  email?: string | null;
  score?: number | null;
}

/* ===================== Helpers ===================== */

function apiToUiStatus(s: "todo" | "in_progress" | "done"): TaskStatusUI {
  return s === "in_progress" ? "in-progress" : s;
}
function uiToApiStatus(s: TaskStatusUI): "todo" | "in_progress" | "done" {
  return s === "in-progress" ? "in_progress" : s;
}
function initials(nameOrEmail?: string | null) {
  if (!nameOrEmail) return "?";
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function InitialAvatar({
  label,
  size = "8",
}: {
  label: string;
  size?: "6" | "8" | "9";
}) {
  return (
    <Avatar className={`h-${size} w-${size}`}>
      <AvatarFallback className="bg-white text-black font-semibold">
        {label}
      </AvatarFallback>
    </Avatar>
  );
}

/* ===================== Component ===================== */

export default function ProjectDetail({
  project,
  onBack,
}: {
  project: Project;
  onBack: () => void;
}) {
  const { user, isLoading, token: rawToken } = useAuth();
  const token: string | undefined = rawToken ?? undefined; // normalize null → undefined
  const pidNum = Number(project.id);

  const [activeTab, setActiveTab] = useState<string>("board");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<TaskUI[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);

  // new task fields
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDue, setNewDue] = useState<string>("");
  const [newPriority, setNewPriority] = useState<TaskPriorityUI>("medium");
  const [newAssignee, setNewAssignee] = useState<number | "">("");
  const [newStatus, setNewStatus] = useState<TaskStatusUI>("todo");
  const [postingTask, setPostingTask] = useState(false);

  // chat
  const [msgText, setMsgText] = useState("");
  const [postingMsg, setPostingMsg] = useState(false);

  // load data
  useEffect(() => {
    let cancelled = false;

    async function loadInner() {
      const [mem, apiTasks, msgs] = await Promise.all([
        listMembers(pidNum, token!),                 // ✅ sends token
        listTasks(pidNum, token!),                   // ✅ sends token
        getJSON<Message[]>(`/api/v1/projects/${pidNum}/messages`, token), // ✅ send token
      ]);

      if (cancelled) return;

      setMembers(mem || []);

      const memMap = new Map<number, Member>();
      (mem || []).forEach((m) => memMap.set(m.id, m));

      const tUI: TaskUI[] = (apiTasks || []).map((t: any) => {
        const m = t.assignee_id ? memMap.get(t.assignee_id) : undefined;
        return {
          id: t.id,
          title: t.title,
          description: t.description || "",
          assigneeId: t.assignee_id ?? null,
          assigneeName: m?.name || m?.email || "Unassigned",
          status: apiToUiStatus(t.status),
          priority: t.priority,
          dueDate: t.due_date ?? null,
        };
      });
      setTasks(tUI);

      // Leaderboard (optional endpoint) — send token + normalize to Leader[]
      try {
        const lb = await getJSON<LeaderRow[] | Leader[]>(
          `/api/v1/analytics/leaderboard/${pidNum}`,
          token
        );
        const normalized: Leader[] = (lb || []).map((row: any) => ({
          userId: Number(row.userId ?? row.user_id ?? 0),
          name: String(row.name ?? row.email ?? "Member"),
          score: Number(row.score ?? 0),
        }));
        setLeaders(normalized);
      } catch {
        setLeaders([]);
      }

      setMessages((msgs || []).map((x) => ({ ...x, id: Number(x.id) })));
    }

    async function loadAll() {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        await loadInner();
      } catch (err: any) {
        // not a member → auto-join once
        if (
          typeof err?.message === "string" &&
          err.message.toLowerCase().includes("not a member")
        ) {
          await fetch(`${API}/api/v1/projects/${pidNum}/join`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          await loadInner();
        } else {
          setError(err?.message || "Failed to load project data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [pidNum, token]);

  const columns = useMemo(() => {
    return {
      todo: tasks.filter((t) => t.status === "todo"),
      inProgress: tasks.filter((t) => t.status === "in-progress"),
      done: tasks.filter((t) => t.status === "done"),
    };
  }, [tasks]);

  const refreshTasks = async () => {
    const apiTasks = await listTasks(pidNum, token!);
    const memMap = new Map<number, Member>();
    members.forEach((m) => memMap.set(m.id, m));
    const tUI: TaskUI[] = apiTasks.map((t: any) => {
      const m = t.assignee_id ? memMap.get(t.assignee_id) : undefined;
      return {
        id: t.id,
        title: t.title,
        description: t.description || "",
        assigneeId: t.assignee_id ?? null,
        assigneeName: m?.name || m?.email || "Unassigned",
        status: apiToUiStatus(t.status),
        priority: t.priority,
        dueDate: t.due_date ?? null,
      };
    });
    setTasks(tUI);
  };

  /** Only allow switching between To-Do and In-Progress here */
  const setStatus = async (taskId: number, newStatus: TaskStatusUI) => {
    if (newStatus === "done") return;
    try {
      await apiUpdateTask(taskId, token!, { status: uiToApiStatus(newStatus) });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (e: any) {
      alert(e?.message || "Failed to update status");
    }
  };

  /** Checkbox → Done / To-Do */
  const toggleDone = async (taskId: number, checked: boolean) => {
    try {
      await apiUpdateTask(taskId, token!, {
        status: checked ? "done" : "todo",
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: checked ? "done" : "todo" } : t
        )
      );
    } catch (e: any) {
      alert(e?.message || "Failed to update task");
    }
  };

  const assignTask = async (taskId: number, assigneeId: number | null) => {
    try {
      await apiUpdateTask(taskId, token!, { assignee_id: assigneeId });
    } catch (e: any) {
      alert(e?.message || "Failed to reassign task");
    } finally {
      await refreshTasks();
    }
  };

  const createTask = async () => {
    if (!newTitle.trim()) return;
    setPostingTask(true);
    try {
      await apiCreateTask(pidNum, token!, {
        title: newTitle.trim(),
        description: newDesc || "",
        assignee_id: newAssignee === "" ? null : Number(newAssignee),
        due_date: newDue || null,
        priority: newPriority,
        status: uiToApiStatus(newStatus),
      });
      setNewTitle("");
      setNewDesc("");
      setNewDue("");
      setNewPriority("medium");
      setNewAssignee("");
      setNewStatus("todo");
      await refreshTasks();
    } catch (e: any) {
      alert(e?.message || "Failed to create task");
    } finally {
      setPostingTask(false);
    }
  };

  const sendMessage = async () => {
    const body = msgText.trim();
    if (!body) return;
    setPostingMsg(true);
    try {
      await postJSON(`/api/v1/projects/${pidNum}/messages`, { content: body }, token); // ✅ send token
      const m = await getJSON<Message[]>(
        `/api/v1/projects/${pidNum}/messages`,
        token
      ); // ✅ send token
      setMessages(m || []);
      setMsgText("");
    } catch (e: any) {
      alert(e?.message || "Failed to send message");
    } finally {
      setPostingMsg(false);
    }
  };

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
          <div className="ml-auto text-sm text-muted-foreground">
            {project.description}
          </div>
        </div>
      </div>

      <main className="p-4 md:p-6 space-y-6">
        {error && <div className="text-sm text-red-500">Error: {error}</div>}
        {loading && (
          <div className="text-sm text-muted-foreground">Loading project…</div>
        )}

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
                    <TaskRow
                      key={t.id}
                      t={t}
                      members={members}
                      onSetStatus={(s) => setStatus(t.id, s)}
                      onDoneToggle={(checked) => toggleDone(t.id, checked)}
                      onAssign={(id) => assignTask(t.id, id)}
                    />
                  ))}

                  {/* New task */}
                  <div className="space-y-2 border-t pt-3">
                    <Input
                      placeholder="New task title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                    <Textarea
                      placeholder="Description (optional)"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                    />
                    <div className="grid md:grid-cols-4 grid-cols-1 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Assignee
                        </label>
                        <select
                          className="w-full rounded-md border bg-background p-2 text-sm h-9 leading-9 focus:outline-none focus:ring-2 focus:ring-primary/40"
                          value={newAssignee}
                          onChange={(e) =>
                            setNewAssignee(
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
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
                        <label className="text-xs text-muted-foreground">
                          Due date
                        </label>
                        <Input
                          type="date"
                          value={newDue}
                          onChange={(e) => setNewDue(e.target.value)}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Priority
                        </label>
                        <select
                          className="w-full rounded-md border bg-background p-2 text-sm h-9 leading-9 focus:outline-none focus:ring-2 focus:ring-primary/40"
                          value={newPriority}
                          onChange={(e) =>
                            setNewPriority(e.target.value as TaskPriorityUI)
                          }
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Status
                        </label>
                        <select
                          className="w-full rounded-md border bg-background p-2 text-sm h-9 leading-9 focus:outline-none focus:ring-2 focus:ring-primary/40"
                          value={newStatus}
                          onChange={(e) =>
                            setNewStatus(e.target.value as TaskStatusUI)
                          }
                        >
                          <option value="todo">To-Do</option>
                          <option value="in-progress">In-Progress</option>
                          <option value="done">Done</option>
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
                  <CardTitle className="text-sm font-semibold">
                    In Progress
                  </CardTitle>
                  <Badge variant="secondary">{columns.inProgress.length}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {columns.inProgress.map((t) => (
                    <TaskRow
                      key={t.id}
                      t={t}
                      members={members}
                      onSetStatus={(s) => setStatus(t.id, s)}
                      onDoneToggle={(checked) => toggleDone(t.id, checked)}
                      onAssign={(id) => assignTask(t.id, id)}
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
                    <TaskRow
                      key={t.id}
                      t={t}
                      members={members}
                      onSetStatus={(s) => setStatus(t.id, s)}
                      onDoneToggle={(checked) => toggleDone(t.id, checked)}
                      onAssign={(id) => assignTask(t.id, id)}
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
                <CardTitle className="text-sm font-semibold">
                  Project Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-[50vh] overflow-auto pr-2">
                  {messages.map((m) => (
                    <div key={m.id} className="flex items-start gap-3">
                      <InitialAvatar label={initials(m.author)} size="8" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{m.author}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(m.timestamp).toLocaleString()}
                        </div>
                        <div className="mt-1 text-sm">{m.content}</div>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      No messages yet.
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Write a message…"
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                  />
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
                <CardTitle className="text-sm font-semibold">
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 border rounded-md p-3"
                  >
                    <InitialAvatar
                      label={initials(m.name || m.email)}
                      size="9"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {m.name || m.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.email}
                      </div>
                      <div className="text-xs mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> 0 done
                        </span>
                        <span className="flex items-center gap-1">
                          1 project
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary">—</Badge>
                  </div>
                ))}
                {members.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No members yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LEADERBOARD */}
          <TabsContent value="leaderboard" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Team Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {leaders.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No activity yet.
                  </div>
                )}
                {leaders.map((l, idx) => (
                  <div
                    key={l.userId}
                    className="flex items-center gap-3 border rounded-md p-3"
                  >
                    <div className="w-6 text-sm font-semibold">{idx + 1}</div>
                    <InitialAvatar label={initials(l.name)} size="8" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{l.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Score
                      </div>
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
  );
}

/* ===================== Task Row ===================== */

function TaskRow({
  t,
  members,
  onSetStatus,   // only "todo" | "in-progress"
  onDoneToggle,  // checkbox → done / todo
  onAssign,
}: {
  t: {
    id: number
    title: string
    description?: string
    assigneeId: number | null
    assigneeName: string
    status: "todo" | "in-progress" | "done"
    priority: "low" | "medium" | "high"
    dueDate: string | null
  }
  members: Member[]
  onSetStatus: (s: "todo" | "in-progress") => void
  onDoneToggle: (checked: boolean) => void
  onAssign: (assigneeId: number | null) => void
}) {
  const isDone = t.status === "done"
  // What the control should show when a task is done; we keep the flow between todo <-> in-progress
  const flowStatus: "todo" | "in-progress" =
    t.status === "done" ? "todo" : (t.status as "todo" | "in-progress")

  return (
    <div className="border rounded-md p-3">
      <div className="flex items-start justify-between gap-3">
        {/* Left: checkbox + title/desc/date */}
        <div className="flex items-start gap-3">
          {/* Done checkbox */}
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-primary"
            checked={isDone}
            onChange={(e) => onDoneToggle(e.target.checked)}
            title={isDone ? "Mark as To-Do" : "Mark as Done"}
          />
          <div>
            <div
              className={`text-sm font-medium ${
                isDone ? "line-through text-muted-foreground" : ""
              }`}
            >
              {t.title}
            </div>
            {t.description && (
              <div className="text-xs text-muted-foreground line-clamp-2">
                {t.description}
              </div>
            )}
            <div className="mt-1 text-xs text-muted-foreground">
              {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
            </div>
          </div>
        </div>

        {/* Right: Status selector (To-Do / In-Progress), disabled when Done */}
        <div className="relative">
          {/* gear icon */}
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.05 7.05 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 14.3 1h-4.6a.5.5 0 0 0-.49.41l-.36 2.54c-.58.22-1.12.52-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L.72 7.98a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L.84 13.66a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.41 1.05.74 1.63.94l.36 2.54c.04.24.25.41.49.41h4.6c.24 0 .45-.17.49-.41l.36-2.54c.58-.22 1.12-.52 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
          </svg>

          <select
            className="appearance-none border rounded-md h-8 pl-8 pr-6 bg-background text-xs
                       focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            value={flowStatus} // "todo" or "in-progress" (never "done" here)
            onChange={(e) => onSetStatus(e.target.value as "todo" | "in-progress")}
            disabled={isDone}
            title={isDone ? "Uncheck to change status" : "Change status"}
          >
            <option value="todo">To-Do</option>
            <option value="in-progress">In-Progress</option>
          </select>

          {/* little caret */}
          <svg
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" />
          </svg>
        </div>
      </div>

      {/* Bottom row: priority + assignee / reassignment */}
      <div className="mt-3 flex items-center justify-between">
        <Badge variant="secondary" className="capitalize">
          {t.priority}
        </Badge>

        <div className="flex items-center gap-2">
          <InitialAvatar label={initials(t.assigneeName)} size="6" />
          <span className="text-xs">{t.assigneeName}</span>

          {/* Assign select */}
          <select
            className="border rounded-md h-8 px-2 bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={t.assigneeId ?? ""}
            onChange={(e) => onAssign(e.target.value === "" ? null : Number(e.target.value))}
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
