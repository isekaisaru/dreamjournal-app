import { Dream } from "@/app/types";
import React from "react";
import DreamCard from "./DreamCard";

type DreamListProps = {
  dreams: Dream[];
};

const DreamList = ({ dreams }: DreamListProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {dreams.map((dream) => (
        <DreamCard dream={dream} key={dream.id} />
      ))}
    </div>
  );
};

export default DreamList;
