"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export function useLogout() {
  const router = useRouter();
  const { logout } = useAuth();

  return () => {
    logout();
    router.push("/auth");
  };
}
