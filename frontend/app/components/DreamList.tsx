"use client";

import { Dream } from "@/app/types";
import React from "react";
import DreamCard from "./DreamCard";
import { motion } from "framer-motion";

interface DreamListProps {
  dreams: Dream[];
  onDelete?: (id: number) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const DreamList = ({ dreams }: DreamListProps) => {
  console.log(`[DreamList] Received ${dreams.length} dreams`);
  return (
    <>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-4"
      >
        {dreams.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <div className="text-4xl mb-4">🌙</div>
            <p className="text-lg font-bold mb-2">まだ ゆめ は ないよ</p>
            <p className="text-sm">きょう みた ゆめ を おしえてね</p>
          </div>
        ) : (
          dreams.map((dream) => (
            <motion.div key={dream.id} variants={item}>
              <DreamCard dream={dream} />
            </motion.div>
          ))
        )}
      </motion.div>
    </>
  );
};

export default DreamList;
