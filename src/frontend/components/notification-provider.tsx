"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  timestamp: string
  read: boolean
  actionUrl?: string
  projectId?: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void
  removeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

const mockNotifications: Notification[] = [
  {
    id: "1",
    title: "Task Assigned",
    message: "You've been assigned to 'Design new homepage layout'",
    type: "info",
    timestamp: "2024-01-22T10:30:00Z",
    read: false,
    projectId: "1",
  },
  {
    id: "2",
    title: "Deadline Approaching",
    message: "Task 'Content migration' is due in 2 days",
    type: "warning",
    timestamp: "2024-01-22T09:15:00Z",
    read: false,
    projectId: "1",
  },
  {
    id: "3",
    title: "Task Completed",
    message: "Alex Rivera completed 'Set up analytics tracking'",
    type: "success",
    timestamp: "2024-01-22T08:45:00Z",
    read: true,
    projectId: "1",
  },
  {
    id: "4",
    title: "New Message",
    message: "Sarah Chen posted in Website Redesign project",
    type: "info",
    timestamp: "2024-01-22T08:00:00Z",
    read: false,
    projectId: "1",
  },
  {
    id: "5",
    title: "Project Update",
    message: "Mobile App Launch project is 80% complete",
    type: "success",
    timestamp: "2024-01-21T16:30:00Z",
    read: true,
    projectId: "2",
  },
]

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
    }
    setNotifications((prev) => [newNotification, ...prev])
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
        removeNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}
