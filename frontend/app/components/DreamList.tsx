import { Dream } from "@/app/types";
import React from "react";
import DreamCard from "./DreamCard";

type DreamListProps = {
  dreams: Dream[];
};

const DreamList = ({ dreams }: DreamListProps) => {
  return (
    <div className="w-full grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-4">
      {dreams.map((dream) => (
        <DreamCard dream={dream} key={dream.id} />
      ))}
    </div>
  );
};

export default DreamList;
