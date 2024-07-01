"use client";

import { useState, useEffect } from "react";

export default function useSimpleAuth() {
  console.log("useSimpleAuth hook initialized");

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    console.log("useSimpleAuth hook called");
    setIsAuthenticated(true); // テストのために常にtrueに設定
    console.log("isAuthenticated state set to true");
  }, []);

  return isAuthenticated;
}