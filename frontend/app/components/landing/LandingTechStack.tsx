"use client";

import { motion, useReducedMotion } from "framer-motion";

const TECH_STACK = [
  "Next.js", "React", "TypeScript", "Tailwind CSS",
  "Ruby on Rails", "PostgreSQL", "OpenAI API", "Stripe",
  "Vercel", "Render",
];

export default function LandingTechStack() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? undefined : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="border-t border-slate-200 px-4 py-8 dark:border-slate-800/50"
    >
      <p className="mb-3 text-center text-xs text-slate-500 dark:text-slate-600">Built with</p>
      <div className="mx-auto flex max-w-lg flex-wrap justify-center gap-1.5">
        {TECH_STACK.map((tech) => (
          <span
            key={tech}
            className="rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 text-[10px] font-medium text-slate-500 dark:border-slate-800/60 dark:bg-transparent dark:text-slate-500"
          >
            {tech}
          </span>
        ))}
      </div>
    </motion.section>
  );
}
