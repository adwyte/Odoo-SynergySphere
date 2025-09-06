"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { listMyProjects, createProject as apiCreateProject } from "@/lib/projects"
import { useAuth } from "@/components/auth-provider"
import { API } from "@/lib/api"
import { useLogout } from "@/hooks/use-logout"

import {
  Plus,
  Search,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreHorizontal,
  LogOut,
  Settings,
  BarChart3,
  UserPlus,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import ProjectDetail from "@/components/project-detail"
import NotificationDropdown from "@/components/notification-dropdown"
import { ThemeToggle } from "@/components/theme-toggle"

type ProjectStatus = "active" | "completed" | "overdue"

interface Project {
  id: string
  name: string
  description: string
  members: number
  tasksCompleted: number
  totalTasks: number
  dueDate: string | null
  status: ProjectStatus
  color: string
}

export default function Dashboard() {
  const router = useRouter()
  const { user, token, isLoading } = useAuth()
  const doLogout = useLogout()

  // redirect to /auth if not logged in
  useEffect(() => {
    if (!isLoading && !user) router.push("/auth")
  }, [isLoading, user, router])

  const [searchQuery, setSearchQuery] = useState("")
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [creating, setCreating] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(false)

  // load projects from API
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) return
      setLoading(true); setError(null)
      try {
        const data = await listMyProjects(token)
        if (!cancelled)
          setProjects(
            (data || []).map((p) => ({
              id: String(p.id),
              name: p.name,
              description: p.description,
              members: p.members,
              tasksCompleted: p.tasksCompleted,
              totalTasks: p.totalTasks,
              dueDate: p.dueDate,
              status: p.status,
              color: p.color,
            })),
          )
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load projects")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token])

  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q),
    )
  }, [projects, searchQuery])

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-primary text-primary-foreground">Active</Badge>
      case "completed":
        return <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>
      default:
        return null
    }
  }

  const getProgressPercentage = (completed: number, total: number) => {
    if (!total) return 0
    return Math.round((completed / total) * 100)
  }

  const handleProjectClick = (project: Project) => setSelectedProject(project)
  const handleBackToDashboard = () => setSelectedProject(null)

  const handleCreateProject = async () => {
    if (!token) return alert("Please sign in first.")
    const name = prompt("Project name?")
    if (!name) return
    const description = prompt("Short description?") || ""
    setCreating(true); setError(null)
    try {
      await apiCreateProject(token, { name, description })
      const data = await listMyProjects(token)
      setProjects(
        (data || []).map((p) => ({
          id: String(p.id),
          name: p.name,
          description: p.description,
          members: p.members,
          tasksCompleted: p.tasksCompleted,
          totalTasks: p.totalTasks,
          dueDate: p.dueDate,
          status: p.status,
          color: p.color,
        })),
      )
    } catch (e: any) {
      setError(e?.message || "Failed to create project")
    } finally {
      setCreating(false)
    }
  }

  const handleBootstrapDemo = async () => {
    if (!token) return alert("Please sign in first.")
    setBootstrapping(true)
    try {
      const res = await fetch(`${API}/api/v1/demo/bootstrap`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await listMyProjects(token) // refresh via authed API
      setProjects(
        (data || []).map((p) => ({
          id: String(p.id),
          name: p.name,
          description: p.description,
          members: p.members,
          tasksCompleted: p.tasksCompleted,
          totalTasks: p.totalTasks,
          dueDate: p.dueDate,
          status: p.status,
          color: p.color,
        })),
      )
    } catch (e: any) {
      setError(e?.message || "Failed to populate demo data")
    } finally {
      setBootstrapping(false)
    }
  }

  if (selectedProject) {
    return <ProjectDetail project={selectedProject} onBack={handleBackToDashboard} />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex h-16 items-center px-4 md:px-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">SynergySphere</h1>
            </div>
          </div>

          <div className="ml-auto flex items-center space-x-2 sm:space-x-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/analytics")} className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/team")} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Team
            </Button>
            <Button variant="ghost" size="sm" onClick={doLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
            <ThemeToggle />
            <NotificationDropdown />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name || "User"} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {(user?.name || user?.email || "?")
                        .split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name || "—"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email || "—"}</p>
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

      {/* Main Content */}
      <main className="flex-1 space-y-6 p-4 md:p-6">
        {/* Welcome */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">
            Welcome back, {(user?.name || user?.email || "there").split(" ")[0]}!
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
            <div className="flex items-center space-x-2 w-full sm:w-auto">
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
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleProjectClick(project)}
              >
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className={`w-3 h-3 rounded-full ${project.color}`} />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Project</DropdownMenuItem>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
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

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>{project.members} members</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "—"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!loading && filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No projects found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Try adjusting your search terms." : "Create your first project or populate a demo."}
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleCreateProject}
                  disabled={creating}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {creating ? "Creating..." : "Create Project"}
                </Button>
                <Button variant="secondary" onClick={handleBootstrapDemo} disabled={bootstrapping || !token}>
                  {bootstrapping ? "Populating…" : "Quick Demo Populate"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
