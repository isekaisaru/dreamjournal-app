// app/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import HomePage from "./home/page";
import TrialPage from "./trial/page";
import Loading from "./loading";

export default function IndexPage() {
  const { isLoggedIn } = useAuth();

  if (isLoggedIn === null) {
    return <Loading />;
  }

  if (isLoggedIn) {
    return <HomePage />;
  } else {
    return <TrialPage />;
  }
}
