"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "./ui/button";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { User } from "@/app/types";

const TrialUserButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleTrialUser = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.post<{ user: User }>("/trial_users");
      if (response && response.user) {
        login({ ...response.user, id: String(response.user.id) }); // loginに渡す前にidをstringに変換
      }
      toast.success("お試しユーザーとしてログインしました！");
    } catch (error: any) {
      console.error("Trial user creation failed:", error);
      const errorMessage = error.response?.data?.error
        ? error.response.data.error
        : "お試しユーザーの作成に失敗しました。";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleTrialUser} disabled={isLoading} variant="secondary">
      {isLoading ? "作成中..." : "お試しユーザーとして始める"}
    </Button>
  );
};

export default TrialUserButton;
