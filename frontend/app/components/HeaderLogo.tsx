"use client";

import Link from "next/link";
import { Moon, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function HeaderLogo() {
  const { isLoggedIn } = useAuth();

  return (
    <Link
      href={isLoggedIn ? "/home" : "/"}
      className="flex items-center gap-2 text-primary hover:text-primary/90 transition-opacity"
    >
      <Moon className="text-blue-300" size={32} />
      <span className="text-2xl font-extrabold tracking-tight">ユメログ</span>
      <Sparkles className="text-yellow-300" size={24} />
    </Link>
  );
}
