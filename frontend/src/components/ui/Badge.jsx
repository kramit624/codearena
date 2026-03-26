import { cn } from "../../lib/utils.js";

export default function Badge({ children, className, variant = "default" }) {
  const variants = {
    default: "bg-white/5       text-slate-400  border-white/10",
    purple: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    cyan: "bg-cyan-500/10   text-cyan-400   border-cyan-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    medium: "bg-amber-500/10  text-amber-400  border-amber-500/20",
    hard: "bg-red-500/10    text-red-400    border-red-500/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variants[variant] ?? variants.default,
        className,
      )}
    >
      {children}
    </span>
  );
}
