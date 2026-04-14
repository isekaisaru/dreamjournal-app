"use client";

import React from "react";
import { MotionConfig } from "framer-motion";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import dynamic from "next/dynamic";

const Toaster = dynamic(
  () => import("react-hot-toast").then((mod) => ({ default: mod.Toaster })),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AuthProvider>
          <Toaster position="top-center" />
          {children}
        </AuthProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
