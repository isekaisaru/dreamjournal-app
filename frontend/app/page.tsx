// app/page.tsx
"use client";

import useAuth from "@/hooks/useAuth";
import HomePage from "./home/page";
import TrialPage from "./trial/page";


export default function IndexPage() {
  try {
    const isAuthenticated = useAuth();
    console.log("isAuthenticated in IndexPage:", isAuthenticated);

    if (isAuthenticated) {
      return <HomePage />;
    } else {
      return <TrialPage />;
    }
  } catch (error) {
    console.error("Error in IndexPage:", error);
    if (error instanceof Error) {
      return <div>Error: {error.message}</div>;
    } else {
      return <div>Unknown error occurred</div>;
    }
  }
}