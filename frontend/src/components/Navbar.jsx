import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  selectCurrentUser,
  selectIsAuthenticated,
  logout,
} from "../store/slices/authSlice.js";
import {
  Code2,
  ChevronDown,
  User,
  BarChart2,
  LogOut,
  Menu,
  X,
  BookOpen,
  Trophy,
  Home,
} from "lucide-react";
import { cn, getInitials } from "../lib/utils.js";
import axiosInstance from "../lib/axios.js";
import toast from "react-hot-toast";
import { gsap } from "gsap";

const navLinks = [
  { label: "Home", href: "/", icon: Home },
  { label: "Problems", href: "/problems", icon: BookOpen },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
];

export default function Navbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    gsap.fromTo(
      navRef.current,
      { y: -80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.2 },
    );
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (dropdownOpen && dropdownRef.current) {
      const menu = dropdownRef.current.querySelector(".dropdown-menu");
      if (menu) {
        gsap.fromTo(
          menu,
          { opacity: 0, y: -8, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" },
        );
      }
    }
  }, [dropdownOpen]);

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (_) {}
    dispatch(logout());
    setDropdownOpen(false);
    navigate("/");
    toast.success("Logged out successfully");
  };

  return (
    <nav
      ref={navRef}
      style={{
        background: "rgba(10, 10, 15, 0.9)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid #1e1e30",
      }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/40 group-hover:shadow-violet-500/60 transition-all duration-300">
              <Code2 size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span style={{ color: "#F97316" }}>Code</span>
              <span className="gradient-text">Arena</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-violet-500/10 text-violet-400"
                      : "text-slate-400 hover:text-white hover:bg-white/5",
                  )}
                >
                  <link.icon size={14} />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:border-violet-500/40 transition-all duration-200 group"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid #2d2d45",
                  }}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shadow-md flex-shrink-0">
                    {getInitials(user.username)}
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors max-w-[100px] truncate hidden sm:block">
                    {user.username}
                  </span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-slate-500 transition-transform duration-200",
                      dropdownOpen && "rotate-180",
                    )}
                  />
                </button>

                {dropdownOpen && (
                  <div
                    className="dropdown-menu absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden shadow-xl shadow-black/60 z-50"
                    style={{
                      background: "rgba(13, 13, 25, 0.98)",
                      backdropFilter: "blur(24px)",
                      WebkitBackdropFilter: "blur(24px)",
                      border: "1px solid #2d2d45",
                    }}
                  >
                    {/* User info header */}
                    <div
                      style={{ borderBottom: "1px solid #1e1e30" }}
                      className="px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white">
                          {getInitials(user.username)}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-semibold text-white truncate">
                            {user.username}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1.5">
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-violet-500/10 transition-all duration-150 group"
                      >
                        <User
                          size={15}
                          className="text-slate-500 group-hover:text-violet-400 transition-colors"
                        />
                        My Profile
                      </Link>
                      <Link
                        to="/progress"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-violet-500/10 transition-all duration-150 group"
                      >
                        <BarChart2
                          size={15}
                          className="text-slate-500 group-hover:text-violet-400 transition-colors"
                        />
                        My Progress
                      </Link>
                    </div>

                    <div
                      style={{ borderTop: "1px solid #1e1e30" }}
                      className="py-1.5"
                    >
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 group"
                      >
                        <LogOut
                          size={15}
                          className="text-slate-500 group-hover:text-red-400 transition-colors"
                        />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shadow-lg shadow-violet-600/20 hover:shadow-violet-500/30 transition-all duration-200"
                >
                  Sign Up
                </Link>
              </div>
            )}

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          style={{ background: "#0f0f1a", borderTop: "1px solid #1e1e30" }}
          className="md:hidden"
        >
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <link.icon size={15} />
                {link.label}
              </Link>
            ))}
            {!isAuthenticated && (
              <div
                className="flex gap-2 pt-2"
                style={{ borderTop: "1px solid #1e1e30" }}
              >
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-4 py-2 text-sm font-medium text-slate-300 rounded-lg"
                  style={{ border: "1px solid #2d2d45" }}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-4 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
