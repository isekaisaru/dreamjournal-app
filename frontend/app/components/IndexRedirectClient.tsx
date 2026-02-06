"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function IndexRedirectClient() {
  const router = useRouter();
  const { authStatus } = useAuth();

  useEffect(() => {
    if (authStatus === "authenticated") {
      router.replace("/home");
    } else if (authStatus === "unauthenticated") {
      router.replace("/trial");
    }
  }, [authStatus, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
      認証状態を確認しています…
    </div>
  );
}
