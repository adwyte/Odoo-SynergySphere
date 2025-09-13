"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import ProjectDetail from "@/components/project-detail"
import { useAuth } from "@/components/auth-provider"
import { listMyProjects } from "@/lib/projects"

type ProjectStatus = "active" | "completed" | "overdue"

interface ProjectCard {
  id: number
  name: string
  description: string
  members: number
  tasksCompleted: number
  totalTasks: number
  dueDate: string | null
  status: ProjectStatus
  color: string
}

export default function ProjectPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, token, isLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [project, setProject] = useState<ProjectCard | null>(null)

  const handleBack = () => router.push("/")

  useEffect(() => {
    if (!isLoading && !user) router.replace("/auth")
  }, [isLoading, user, router])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const all = await listMyProjects(token)
        const found = (all || []).find((p) => String(p.id) === String(params.id)) || null
        if (!cancelled) setProject(found)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load project")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token, params.id])

  const shaped = useMemo(() => {
    if (!project) return null
    return {
      id: String(project.id),
      name: project.name,
      description: project.description || "",
      members: project.members || 0,
      tasksCompleted: project.tasksCompleted || 0,
      totalTasks: project.totalTasks || 0,
      dueDate: project.dueDate,
      status: project.status,
      color: project.color || "bg-blue-500",
    }
  }, [project])

  if (isLoading || loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading project…</div>
  }

  if (error) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-sm text-red-500">Error: {error}</div>
        <button className="underline text-sm" onClick={handleBack}>Back to Dashboard</button>
      </div>
    )
  }

  if (!shaped) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-sm text-muted-foreground">Project not found or you’re not a member yet.</div>
        <button className="underline text-sm" onClick={handleBack}>Back to Dashboard</button>
      </div>
    )
  }

  return <ProjectDetail project={shaped} onBack={handleBack} />
}
