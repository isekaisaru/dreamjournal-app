import React from "react";
import axios from "axios";

interface TrialUserButtonProps {
  setUser: ({ id, token }: { id: number; token: string }) => void;
}

const TrialUserButton: React.FC<TrialUserButtonProps> = ({ setUser }) => {
  const handleTrialUser = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/trial_users`
      );
      const { user_id: id, token } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user_id", id.toString());

      setUser({ id, token });
    } catch (error) {
      console.error("Error creating trial user:", error);
    }
  };

  return <button onClick={handleTrialUser}>お試しユーザーとして始める</button>;
};

export default TrialUserButton;
