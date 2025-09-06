"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  Plus,
  Search,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  MessageSquare,
  Paperclip,
  Send,
  Reply,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import NotificationDropdown from "@/components/notification-dropdown"
import { useNotifications } from "@/components/notification-provider"

interface Project {
  id: string
  name: string
  description: string
  members: number
  tasksCompleted: number
  totalTasks: number
  dueDate: string
  status: "active" | "completed" | "overdue"
  color: string
}

interface Task {
  id: string
  title: string
  description: string
  assignee: string
  assigneeAvatar: string
  status: "todo" | "in-progress" | "done"
  priority: "low" | "medium" | "high"
  dueDate: string
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
  replyTo?: string
}

const mockTasks: Task[] = [
  {
    id: "1",
    title: "Design new homepage layout",
    description: "Create wireframes and mockups for the new homepage design",
    assignee: "Sarah Chen",
    assigneeAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    status: "in-progress",
    priority: "high",
    dueDate: "2024-02-10",
    createdAt: "2024-01-15",
    comments: 3,
    attachments: 2,
  },
  {
    id: "2",
    title: "Implement responsive navigation",
    description: "Build mobile-friendly navigation component with hamburger menu",
    assignee: "Mike Johnson",
    assigneeAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mike",
    status: "todo",
    priority: "medium",
    dueDate: "2024-02-12",
    createdAt: "2024-01-16",
    comments: 1,
    attachments: 0,
  },
  {
    id: "3",
    title: "Set up analytics tracking",
    description: "Configure Google Analytics and set up conversion tracking",
    assignee: "Alex Rivera",
    assigneeAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
    status: "done",
    priority: "low",
    dueDate: "2024-02-08",
    createdAt: "2024-01-10",
    comments: 0,
    attachments: 1,
  },
  {
    id: "4",
    title: "Content migration",
    description: "Migrate existing content from old website to new structure",
    assignee: "Emma Davis",
    assigneeAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma",
    status: "in-progress",
    priority: "high",
    dueDate: "2024-02-14",
    createdAt: "2024-01-18",
    comments: 5,
    attachments: 3,
  },
  {
    id: "5",
    title: "Performance optimization",
    description: "Optimize images and implement lazy loading for better performance",
    assignee: "David Kim",
    assigneeAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=david",
    status: "todo",
    priority: "medium",
    dueDate: "2024-02-16",
    createdAt: "2024-01-20",
    comments: 0,
    attachments: 0,
  },
]

const mockTeamMembers = [
  { id: "1", name: "Sarah Chen", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah" },
  { id: "2", name: "Mike Johnson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mike" },
  { id: "3", name: "Alex Rivera", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex" },
  { id: "4", name: "Emma Davis", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma" },
  { id: "5", name: "David Kim", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=david" },
]

const mockMessages: Message[] = [
  {
    id: "1",
    author: "Sarah Chen",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    content: "Hey team! I've finished the wireframes for the homepage. Can everyone take a look and provide feedback?",
    timestamp: "2024-01-22T10:30:00Z",
  },
  {
    id: "2",
    author: "Mike Johnson",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mike",
    content: "Great work Sarah! The layout looks clean. I think we should add a testimonials section below the hero.",
    timestamp: "2024-01-22T11:15:00Z",
    isReply: true,
    replyTo: "1",
  },
  {
    id: "3",
    author: "Alex Rivera",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
    content: "Analytics setup is complete. We're now tracking page views, conversions, and user engagement.",
    timestamp: "2024-01-22T14:20:00Z",
  },
  {
    id: "4",
    author: "Emma Davis",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma",
    content: "Content migration is going well. About 60% done. Should be finished by tomorrow.",
    timestamp: "2024-01-22T16:45:00Z",
  },
  {
    id: "5",
    author: "David Kim",
    authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=david",
    content: "I agree with Mike about the testimonials. Also, should we consider adding a FAQ section?",
    timestamp: "2024-01-22T17:10:00Z",
    isReply: true,
    replyTo: "1",
  },
]

interface ProjectDetailProps {
  project: Project
  onBack: () => void
}

export default function ProjectDetail({ project, onBack }: ProjectDetailProps) {
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assignee: "",
    priority: "medium" as const,
    dueDate: "",
  })
  const { addNotification } = useNotifications()

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: Task["status"]) => {
    switch (status) {
      case "todo":
        return <Badge variant="secondary">To Do</Badge>
      case "in-progress":
        return <Badge className="bg-primary text-primary-foreground">In Progress</Badge>
      case "done":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Done</Badge>
      default:
        return null
    }
  }

  const getPriorityBadge = (priority: Task["priority"]) => {
    switch (priority) {
      case "low":
        return (
          <Badge variant="outline" className="text-blue-400 border-blue-400">
            Low
          </Badge>
        )
      case "medium":
        return (
          <Badge variant="outline" className="text-yellow-400 border-yellow-400">
            Medium
          </Badge>
        )
      case "high":
        return (
          <Badge variant="outline" className="text-red-400 border-red-400">
            High
          </Badge>
        )
      default:
        return null
    }
  }

  const handleCreateTask = () => {
    if (!newTask.title.trim()) return

    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      assignee: mockTeamMembers.find((m) => m.id === newTask.assignee)?.name || "Unassigned",
      assigneeAvatar: mockTeamMembers.find((m) => m.id === newTask.assignee)?.avatar || "",
      status: "todo",
      priority: newTask.priority,
      dueDate: newTask.dueDate,
      createdAt: new Date().toISOString().split("T")[0],
      comments: 0,
      attachments: 0,
    }

    setTasks([...tasks, task])

    addNotification({
      title: "Task Created",
      message: `New task "${newTask.title}" has been created in ${project.name}`,
      type: "success",
      projectId: project.id,
    })

    setNewTask({
      title: "",
      description: "",
      assignee: "",
      priority: "medium",
      dueDate: "",
    })
    setIsCreateTaskOpen(false)
  }

  const handleStatusChange = (taskId: string, newStatus: Task["status"]) => {
    const task = tasks.find((t) => t.id === taskId)
    setTasks(tasks.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)))

    if (task) {
      addNotification({
        title: "Task Updated",
        message: `Task "${task.title}" moved to ${newStatus.replace("-", " ")}`,
        type: newStatus === "done" ? "success" : "info",
        projectId: project.id,
      })
    }
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      author: "John Doe", // Current user
      authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
      content: newMessage,
      timestamp: new Date().toISOString(),
      isReply: !!replyingTo,
      replyTo: replyingTo || undefined,
    }

    setMessages([...messages, message])

    addNotification({
      title: "New Message",
      message: `You posted a message in ${project.name}`,
      type: "info",
      projectId: project.id,
    })

    setNewMessage("")
    setReplyingTo(null)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const getReplyToMessage = (replyToId: string) => {
    return messages.find((m) => m.id === replyToId)
  }

  const tasksByStatus = {
    todo: filteredTasks.filter((t) => t.status === "todo"),
    "in-progress": filteredTasks.filter((t) => t.status === "in-progress"),
    done: filteredTasks.filter((t) => t.status === "done"),
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex h-16 items-center px-4 md:px-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${project.color}`} />
              <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
            </div>
          </div>

          <div className="ml-auto flex items-center space-x-2">
            <NotificationDropdown />

            <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>Add a new task to {project.name}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Task Title</Label>
                    <Input
                      id="title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      placeholder="Enter task title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      placeholder="Enter task description"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assignee">Assignee</Label>
                      <Select
                        value={newTask.assignee}
                        onValueChange={(value) => setNewTask({ ...newTask, assignee: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockTeamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={newTask.priority}
                        onValueChange={(value: "low" | "medium" | "high") =>
                          setNewTask({ ...newTask, priority: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateTaskOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTask} className="bg-primary hover:bg-primary/90">
                    Create Task
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 space-y-6 p-4 md:p-6">
        {/* Project Info */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-muted-foreground">{project.description}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Users className="h-3 w-3" />
                  <span>{project.members} members</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>Due {new Date(project.dueDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-input border-border"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Task Views and Communication */}
        <Tabs defaultValue="board" className="space-y-4">
          <TabsList>
            <TabsTrigger value="board">Board View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="communication">
              <MessageSquare className="h-4 w-4 mr-2" />
              Team Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-3">
              {/* To Do Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    To Do ({tasksByStatus.todo.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {tasksByStatus.todo.map((task) => (
                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium line-clamp-2">{task.title}</CardTitle>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStatusChange(task.id, "in-progress")}>
                                Move to In Progress
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(task.id, "done")}>
                                Mark as Done
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-3 w-3" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-3 w-3" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardDescription className="text-xs line-clamp-2">{task.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="flex items-center justify-between">
                          {getPriorityBadge(task.priority)}
                          <div className="flex items-center space-x-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={task.assigneeAvatar || "/placeholder.svg"} />
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {task.assignee
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                          <div className="flex items-center space-x-2">
                            {task.comments > 0 && (
                              <div className="flex items-center space-x-1">
                                <MessageSquare className="h-3 w-3" />
                                <span>{task.comments}</span>
                              </div>
                            )}
                            {task.attachments > 0 && (
                              <div className="flex items-center space-x-1">
                                <Paperclip className="h-3 w-3" />
                                <span>{task.attachments}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* In Progress Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 text-primary" />
                    In Progress ({tasksByStatus["in-progress"].length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {tasksByStatus["in-progress"].map((task) => (
                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow border-primary/20">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium line-clamp-2">{task.title}</CardTitle>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStatusChange(task.id, "todo")}>
                                Move to To Do
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(task.id, "done")}>
                                Mark as Done
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-3 w-3" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-3 w-3" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardDescription className="text-xs line-clamp-2">{task.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="flex items-center justify-between">
                          {getPriorityBadge(task.priority)}
                          <div className="flex items-center space-x-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={task.assigneeAvatar || "/placeholder.svg"} />
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {task.assignee
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                          <div className="flex items-center space-x-2">
                            {task.comments > 0 && (
                              <div className="flex items-center space-x-1">
                                <MessageSquare className="h-3 w-3" />
                                <span>{task.comments}</span>
                              </div>
                            )}
                            {task.attachments > 0 && (
                              <div className="flex items-center space-x-1">
                                <Paperclip className="h-3 w-3" />
                                <span>{task.attachments}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Done Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                    Done ({tasksByStatus.done.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {tasksByStatus.done.map((task) => (
                    <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow opacity-75">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium line-clamp-2 line-through">{task.title}</CardTitle>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStatusChange(task.id, "todo")}>
                                Move to To Do
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(task.id, "in-progress")}>
                                Move to In Progress
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-3 w-3" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-3 w-3" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardDescription className="text-xs line-clamp-2">{task.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="flex items-center justify-between">
                          {getPriorityBadge(task.priority)}
                          <div className="flex items-center space-x-1">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={task.assigneeAvatar || "/placeholder.svg"} />
                              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                {task.assignee
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Completed</span>
                          <div className="flex items-center space-x-2">
                            {task.comments > 0 && (
                              <div className="flex items-center space-x-1">
                                <MessageSquare className="h-3 w-3" />
                                <span>{task.comments}</span>
                              </div>
                            )}
                            {task.attachments > 0 && (
                              <div className="flex items-center space-x-1">
                                <Paperclip className="h-3 w-3" />
                                <span>{task.attachments}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(task.status)}
                          {getPriorityBadge(task.priority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">{task.title}</h4>
                          <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={task.assigneeAvatar || "/placeholder.svg"} />
                            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                              {task.assignee
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground hidden sm:inline">{task.assignee}</span>
                        </div>
                        <div className="text-sm text-muted-foreground hidden md:block">
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          {task.comments > 0 && (
                            <div className="flex items-center space-x-1">
                              <MessageSquare className="h-3 w-3" />
                              <span className="text-xs">{task.comments}</span>
                            </div>
                          )}
                          {task.attachments > 0 && (
                            <div className="flex items-center space-x-1">
                              <Paperclip className="h-3 w-3" />
                              <span className="text-xs">{task.attachments}</span>
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Task
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="communication" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Chat Area */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Project Discussion
                    </CardTitle>
                    <CardDescription>Team communication for {project.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Messages */}
                    <ScrollArea className="h-96 w-full pr-4">
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div key={message.id} className={`space-y-2 ${message.isReply ? "ml-8" : ""}`}>
                            {message.isReply && message.replyTo && (
                              <div className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-3">
                                Replying to {getReplyToMessage(message.replyTo)?.author}:{" "}
                                {getReplyToMessage(message.replyTo)?.content.substring(0, 50)}...
                              </div>
                            )}
                            <div className="flex items-start space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={message.authorAvatar || "/placeholder.svg"} />
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                  {message.author
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-foreground">{message.author}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimestamp(message.timestamp)}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground">{message.content}</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                                  onClick={() => setReplyingTo(message.id)}
                                >
                                  <Reply className="h-3 w-3 mr-1" />
                                  Reply
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Message Input */}
                    <div className="space-y-2">
                      {replyingTo && (
                        <div className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                          <span className="text-muted-foreground">
                            Replying to {getReplyToMessage(replyingTo)?.author}
                          </span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setReplyingTo(null)}>
                            ×
                          </Button>
                        </div>
                      )}
                      <div className="flex space-x-2">
                        <Textarea
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="flex-1 min-h-[60px] resize-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              handleSendMessage()
                            }
                          }}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim()}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Press Enter to send, Shift+Enter for new line</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Team Members Sidebar */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Team Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {mockTeamMembers.map((member) => (
                        <div key={member.id} className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar || "/placeholder.svg"} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {member.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{member.name}</p>
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <span className="text-xs text-muted-foreground">Online</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      <Users className="h-4 w-4 mr-2" />
                      Add Member
                    </Button>
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      <Paperclip className="h-4 w-4 mr-2" />
                      Share File
                    </Button>
                    <Button variant="outline" className="w-full justify-start bg-transparent">
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Meeting
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
