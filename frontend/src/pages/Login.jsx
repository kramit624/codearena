import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import {
  setCredentials,
  selectIsAuthenticated,
} from "../store/slices/authSlice";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import { gsap } from "gsap";
import { Code2, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) navigate("/problems", { replace: true });
  }, [isAuthenticated]);

  // Entrance animation
  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(
      cardRef.current,
      { opacity: 0, y: 40, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" },
    );
    tl.fromTo(
      cardRef.current.querySelectorAll(".form-item"),
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.07, ease: "power2.out" },
      "-=0.3",
    );
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await axiosInstance.post("/auth/login", data);
      dispatch(setCredentials(res.data.data));
      toast.success(`Welcome back, ${res.data.data.user.username}! 👋`);
      navigate("/problems");
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed";
      toast.error(msg);
      // Shake animation on error
      gsap.fromTo(
        cardRef.current,
        { x: -8 },
        { x: 0, duration: 0.4, ease: "elastic.out(1, 0.3)" },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative px-4 pt-16">
      {/* Background */}
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[140px] pointer-events-none" />

      <div ref={cardRef} className="w-full max-w-md relative z-10">
        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}
        >
          {/* Logo */}
          <div className="form-item flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/40 mb-4">
              <Code2 size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">Welcome back</h1>
            <p className="text-sm text-slate-500 mt-1">
              Login to continue coding
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="form-item">
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register("email")}
                className={`w-full px-4 py-3 rounded-xl bg-gray-50 border text-gray-900 placeholder:text-gray-400 text-sm outline-none transition-all duration-200 focus:bg-white focus:border-violet-500 ${
                  errors.email ? "border-red-400 bg-red-50" : "border-gray-200"
                }`}
              />
              {errors.email && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-400 inline-block" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="form-item">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register("password")}
                  className={`w-full px-4 py-3 pr-11 rounded-xl bg-gray-50 border text-gray-900 placeholder:text-gray-400 text-sm outline-none transition-all duration-200 focus:bg-white focus:border-violet-500 ${
                    errors.password
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-400 inline-block" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="form-item pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-violet-600/25 hover:shadow-violet-500/30 transition-all duration-200 group"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Login
                    <ArrowRight
                      size={15}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="form-item flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-slate-600">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Sign up link */}
          <p className="form-item text-center text-sm text-slate-500">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
            >
              Sign up free
            </Link>
          </p>
        </div>

        {/* Bottom hint */}
        <p className="text-center text-xs text-slate-700 mt-6">
          Protected with JWT + refresh token rotation
        </p>
      </div>
    </div>
  );
}
