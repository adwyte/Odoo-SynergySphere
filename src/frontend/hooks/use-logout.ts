"use client";
import { useAuth } from "@/components/auth-provider";

export function useLogout() {
  const { logout } = useAuth();
  return () => {
    try {
      logout();
    } finally {
      // hard redirect to guarantee clean state
      window.location.href = "/auth";
    }
  };
}
