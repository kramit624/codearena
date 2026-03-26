import { Link } from "react-router-dom";
import { Mail, Code2, MessageCircle } from "lucide-react";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "../store/slices/authSlice.js";
export default function Footer() {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                <Code2 size={14} className="text-white" />
              </div>
              <span className="text-base font-bold">
                <span className="text-white">Code</span>
                <span className="gradient-text">Arena</span>
              </span>
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed">
              Built from scratch. Docker sandbox, BullMQ queues, real-time
              execution. Level up your DSA game.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="#"
                className="text-slate-500 hover:text-violet-400 transition-colors"
              >
                <Mail size={16} />
              </a>
              <a
                href="#"
                className="text-slate-500 hover:text-violet-400 transition-colors"
              >
                <MessageCircle size={16} />
              </a>
              
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Platform
            </h4>
            <ul className="space-y-2">
              {["Problems", "Leaderboard", "Profile"].map((item) => (
                <li key={item}>
                  <Link
                    to={`/${item.toLowerCase()}`}
                    className="text-xs text-slate-500 hover:text-violet-400 transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Stack */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Stack
            </h4>
            <ul className="space-y-2">
              {['Node.js', 'MongoDB', 'Redis', 'Docker', 'BullMQ'].map((item) => (
                <li key={item}>
                  <span className="text-xs text-slate-500">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Account
            </h4>
            <ul className="space-y-2">
              {(
                isAuthenticated
                  ? [
                      { label: "Profile", href: "/profile" },
                      { label: "My Progress", href: "/progress" },
                      { label: "Settings", href: "/settings" },
                    ]
                  : [
                      { label: "Login", href: "/login" },
                      { label: "Sign Up", href: "/signup" },
                      { label: "My Progress", href: "/progress" },
                      { label: "Settings", href: "/settings" },
                    ]
              ).map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    className="text-xs text-slate-500 hover:text-violet-400 transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[var(--border)] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-600">
            © 2025 CodeArena. Built with 🚀 in public.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
