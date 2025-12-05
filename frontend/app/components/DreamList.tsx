"use client";

import { Dream } from "@/app/types";
import React from "react";
import DreamCard from "./DreamCard";
import { motion } from "framer-motion";

type DreamListProps = {
  dreams: Dream[];
};

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
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-4"
    >
      {dreams.map((dream) => (
        <motion.div key={dream.id} variants={item}>
          <DreamCard dream={dream} />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default DreamList;
