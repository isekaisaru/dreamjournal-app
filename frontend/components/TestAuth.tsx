"use client";

import useSimpleAuth from "@/hooks/useSimpleAuth";

export default function TestAuth() {
  const isAuthenticated = useSimpleAuth();
  console.log("isAuthenticated in TestAuth:", isAuthenticated);
  return (
    <div>
      <p>Authentication Status: {isAuthenticated ? "Authenticated" : "Not Authenticated"}</p>
    </div>
  );
}