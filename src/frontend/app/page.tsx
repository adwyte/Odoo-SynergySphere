"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import AuthPage from "@/components/auth-page"
import Dashboard from "@/components/dashboard"

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return user ? <Dashboard /> : <AuthPage />
}
