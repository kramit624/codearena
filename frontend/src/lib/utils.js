import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs) => twMerge(clsx(inputs));

export const getDifficultyColor = (difficulty) => {
  switch (difficulty?.toLowerCase()) {
    case "easy":
      return "text-emerald-400";
    case "medium":
      return "text-amber-400";
    case "hard":
      return "text-red-400";
    default:
      return "text-slate-400";
  }
};

export const getDifficultyBg = (difficulty) => {
  switch (difficulty?.toLowerCase()) {
    case "easy":
      return "bg-emerald-400/10 text-emerald-400 border-emerald-400/20";
    case "medium":
      return "bg-amber-400/10  text-amber-400  border-amber-400/20";
    case "hard":
      return "bg-red-400/10    text-red-400    border-red-400/20";
    default:
      return "bg-slate-400/10  text-slate-400";
  }
};

export const formatTime = (ms) => {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const getInitials = (name) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};
