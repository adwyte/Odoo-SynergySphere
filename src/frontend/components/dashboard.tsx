"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { listMyProjects, createProject as apiCreateProject } from "@/lib/projects";
import { useAuth } from "@/components/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import NotificationDropdown from "@/components/notification-dropdown";
import { useLogout } from "@/hooks/use-logout";

import {
  Plus, Search, Users, Calendar, CheckCircle, Clock, AlertCircle,
  MoreHorizontal, LogOut, Settings, BarChart3, UserPlus
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type ProjectStatus = "active" | "completed" | "overdue";

interface MemberPreview {
  name?: string | null;
  email: string;
}
interface Project {
  id: string;
  name: string;
  description: string;
  members: number;
  tasksCompleted: number;
  totalTasks: number;
  dueDate: string | null;
  status: ProjectStatus;
  color: string;
  membersPreview?: MemberPreview[];
}

function initials(nameOrEmail?: string | null) {
  if (!nameOrEmail) return "?";
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function InitialAvatar({ label, size="6" }: { label: string; size?: "6"|"8"|"9" }) {
  return (
    <Avatar className={`h-${size} w-${size}`}>
      <AvatarFallback className="bg-white text-black font-semibold">{label}</AvatarFallback>
    </Avatar>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const doLogout = useLogout();

  // redirect to /auth if not logged in
  useEffect(() => {
    if (!isLoading && !user) router.push("/auth");
  }, [isLoading, user, router]);

  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) return;
      setLoading(true); setError(null);
      try {
        const data = await listMyProjects(token);
        if (!cancelled) {
          const shaped = (data || []).map((p: any) => ({
            id: String(p.id),
            name: p.name,
            description: p.description,
            members: p.members,
            tasksCompleted: p.tasksCompleted,
            totalTasks: p.totalTasks,
            dueDate: p.dueDate,
            status: p.status,
            color: p.color,
            membersPreview: p.membersPreview || [],
          }));
          setProjects(shaped);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load projects");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-primary text-primary-foreground">Active</Badge>;
      case "completed":
        return <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    if (!total) return 0;
    return Math.round((completed / total) * 100);
  };

  const handleCreateProject = async () => {
    if (!token) return alert("Please sign in first.");
    const name = prompt("Project name?");
    if (!name) return;
    const description = prompt("Short description?") || "";
    setCreating(true); setError(null);
    try {
      await apiCreateProject(token, { name, description });
      const data = await listMyProjects(token);
      setProjects((data || []).map((p: any) => ({
        id: String(p.id),
        name: p.name,
        description: p.description,
        members: p.members,
        tasksCompleted: p.tasksCompleted,
        totalTasks: p.totalTasks,
        dueDate: p.dueDate,
        status: p.status,
        color: p.color,
        membersPreview: p.membersPreview || [],
      })));
    } catch (e: any) {
      setError(e?.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex h-16 items-center px-4 md:px-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">SynergySphere</h1>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/analytics")} className="gap-2">
              <BarChart3 className="h-4 w-4" /> Analytics
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/team")} className="gap-2">
              <UserPlus className="h-4 w-4" /> Team
            </Button>

            <Button variant="ghost" size="sm" onClick={doLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Log out
            </Button>

            <ThemeToggle />
            <NotificationDropdown />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative h-8 w-8">
                  <InitialAvatar label={initials(user.name || user.email)} size="8" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name || "—"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={doLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Welcome back, {(user.name || user.email).split(" ")[0]}!
          </h2>
          <p className="text-muted-foreground">Here's what's happening with your projects today.</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {projects.filter((p) => p.status === "active").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {projects.reduce((acc, p) => acc + (p.tasksCompleted || 0), 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                {projects.reduce((acc, p) => acc + ((p.totalTasks || 0) - (p.tasksCompleted || 0)), 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                {projects.filter((p) => p.status === "overdue").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-semibold text-foreground">Your Projects</h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 bg-input border-border"
                />
              </div>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleCreateProject}
                disabled={creating}
              >
                <Plus className="h-4 w-4 mr-2" />
                {creating ? "Creating..." : "New Project"}
              </Button>
            </div>
          </div>

          {loading && <div className="text-sm text-muted-foreground">Loading projects…</div>}
          {error && <div className="text-sm text-red-500">Error: {error}</div>}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className={`w-3 h-3 rounded-full ${project.color}`} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/project/${project.id}`)}>Open</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">Delete Project</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div>
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </CardDescription>
                  </div>
                  {getStatusBadge(project.status)}
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {project.tasksCompleted}/{project.totalTasks} tasks
                    </span>
                  </div>

                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage(project.tasksCompleted, project.totalTasks)}%` }}
                    />
                  </div>

                  {/* Members preview + due date */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {(project.membersPreview || []).map((m, i) => (
                        <div key={i} className="-ml-1 first:ml-0">
                          <div className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white text-[10px] font-semibold text-black">
                            {initials(m.name || m.email)}
                          </div>
                        </div>
                      ))}
                      <span className="ml-2">{project.members} members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "—"}</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" onClick={() => router.push(`/project/${project.id}`)}>
                    Open project
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
