import { cn } from "../../lib/utils.js";

const variants = {
  primary:
    "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20 hover:shadow-violet-500/30",
  secondary:
    "bg-transparent border border-[var(--border-bright)] hover:border-violet-500/50 text-slate-300 hover:text-white",
  ghost: "bg-transparent hover:bg-white/5 text-slate-400 hover:text-white",
  danger:
    "bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 text-red-400",
  cyan: "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2   text-sm",
  lg: "px-6 py-3   text-base",
  xl: "px-8 py-4   text-lg",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  loading = false,
  ...props
}) {
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
