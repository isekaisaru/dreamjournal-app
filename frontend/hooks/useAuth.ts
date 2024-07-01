"use client";

import { useState, useEffect } from "react";

export default function useAuth() {
  console.log("useAuth hook initialized");

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    console.log("useAuth hook called");
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  return isAuthenticated;
}