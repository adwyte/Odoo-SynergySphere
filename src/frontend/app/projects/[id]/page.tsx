"use client"

import { useParams, useRouter } from "next/navigation"
import ProjectDetail from "@/components/project-detail"

// Mock project data - in real app this would come from API
const mockProject = {
  id: "1",
  name: "Website Redesign",
  description: "Complete overhaul of company website with new branding",
  members: 5,
  tasksCompleted: 12,
  totalTasks: 18,
  dueDate: "2024-02-15",
  status: "active" as const,
  color: "bg-blue-500",
}

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()

  const handleBack = () => {
    router.push("/")
  }

  return <ProjectDetail project={mockProject} onBack={handleBack} />
}
