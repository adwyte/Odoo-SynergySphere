"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Users, CheckCircle, MessageSquare, BarChart3 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useToast } from "@/hooks/use-toast"

export default function AuthPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })
  const { login, signup, verifyOtp, isLoading } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (isLogin) {
        await login(formData.email, formData.password)
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        })
      } else {
        await signup(formData.name, formData.email, formData.password)
        toast({
          title: "Account created!",
          description: "Welcome to SynergySphere.",
        })
        setShowOtpInput(true)
        toast({
          title: "Account created!",
          description: "OTP sent to your email. Please verify.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    }
  }
  const [showOtpInput, setShowOtpInput] = useState(false)
  const [otp, setOtp] = useState("")

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await verifyOtp(formData.email, otp)
      toast({
        title: "Verified!",
        description: "Your account is now verified. You can log in.",
      })
      setShowOtpInput(false)
      setIsLogin(true)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "OTP verification failed",
        variant: "destructive",
      })
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">SynergySphere</h1>
          </div>
          <p className="text-muted-foreground text-balance">Advanced team collaboration platform for modern teams</p>
        </div>

        {/* Auth Card */}
        <Card className="border-border">
          <CardHeader className="space-y-1">
            <Tabs value={isLogin ? "login" : "signup"} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="login"
                  onClick={() => setIsLogin(true)}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  onClick={() => setIsLogin(false)}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-6">
                <CardTitle className="text-xl">Welcome back</CardTitle>
                <CardDescription>Sign in to your SynergySphere account</CardDescription>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <CardTitle className="text-xl">Create account</CardTitle>
                <CardDescription>Join your team on SynergySphere</CardDescription>
              </TabsContent>
            </Tabs>
          </CardHeader>

          <CardContent className="space-y-4">
            {!showOtpInput ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="bg-input border-border"
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="Enter your email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="bg-input border-border"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="bg-input border-border pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-2 text-muted-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <Button variant="link" className="px-0 text-primary hover:text-primary/80">
                    Forgot password?
                  </Button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                      <span>{isLogin ? "Signing In..." : "Creating Account..."}</span>
                    </div>
                  ) : isLogin ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <Input
                    id="otp"
                    placeholder="Enter the OTP sent to your email"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="bg-input border-border"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  Verify OTP
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Features Preview */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto">
              <CheckCircle className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Task Management</p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Team Chat</p>
          </div>
          <div className="space-y-2">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center mx-auto">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">Progress Tracking</p>
          </div>
        </div>
      </div>
    </div>
  )
}
