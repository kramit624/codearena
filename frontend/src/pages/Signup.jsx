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
import {
  Code2,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Circle,
} from "lucide-react";

const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, "At least 3 characters")
      .max(20, "Max 20 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores"),
    email: z.string().email("Enter a valid email"),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "One uppercase letter")
      .regex(/[0-9]/, "One number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Password strength indicator
function PasswordStrength({ password }) {
  const checks = [
    { label: "8+ characters", ok: password?.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password || "") },
    { label: "Contains number", ok: /[0-9]/.test(password || "") },
  ];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">
      {checks.map((c) => (
        <div
          key={c.label}
          className={`flex items-center gap-1.5 text-xs transition-colors ${c.ok ? "text-emerald-400" : "text-slate-600"}`}
        >
          {c.ok ? <CheckCircle2 size={11} /> : <Circle size={11} />}
          {c.label}
        </div>
      ))}
    </div>
  );
}

export default function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(signupSchema) });

  const passwordValue = watch("password");

  useEffect(() => {
    if (isAuthenticated) navigate("/problems", { replace: true });
  }, [isAuthenticated]);

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
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power2.out" },
      "-=0.3",
    );
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = data;
      const res = await axiosInstance.post("/auth/register", payload);
      dispatch(setCredentials(res.data.data));
      toast.success(
        `Account created! Welcome, ${res.data.data.user.username}! 🚀`,
      );
      navigate("/problems");
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed";
      toast.error(msg);
      gsap.fromTo(
        cardRef.current,
        { x: -8 },
        { x: 0, duration: 0.4, ease: "elastic.out(1, 0.3)" },
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full px-4 py-3 rounded-xl bg-white/4 border text-sm text-white placeholder:text-slate-600 outline-none transition-all duration-200 focus:bg-white/6 focus:border-violet-500/60 ${
      hasError
        ? "border-red-500/50 bg-red-500/5"
        : "border-[var(--border-bright)]"
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center relative px-4 pt-16 pb-10">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/6 rounded-full blur-[140px] pointer-events-none" />

      <div ref={cardRef} className="w-full max-w-md relative z-10">
        <div className="glass rounded-2xl border border-[var(--border-bright)] p-8 shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="form-item flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-violet-600/30 mb-4">
              <Code2 size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">Create account</h1>
            <p className="text-sm text-slate-500 mt-1">
              Start your coding journey
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Username */}
            <div className="form-item">
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                placeholder="cool_coder_42"
                autoComplete="username"
                {...register("username")}
                className={inputClass(!!errors.username)}
              />
              {errors.username && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-400 inline-block" />
                  {errors.username.message}
                </p>
              )}
            </div>

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
                className={inputClass(!!errors.email)}
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
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("password")}
                  className={inputClass(!!errors.password) + " pr-11"}
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
              <PasswordStrength password={passwordValue} />
            </div>

            {/* Confirm Password */}
            <div className="form-item">
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                  className={inputClass(!!errors.confirmPassword) + " pr-11"}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-400 inline-block" />
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Terms */}
            <p className="form-item text-xs text-slate-600 leading-relaxed px-1">
              By creating an account you agree to our{" "}
              <span className="text-violet-400 cursor-pointer hover:text-violet-300">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="text-violet-400 cursor-pointer hover:text-violet-300">
                Privacy Policy
              </span>
              .
            </p>

            {/* Submit */}
            <div className="form-item pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-violet-600/20 transition-all duration-200 group"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Create Account
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
          <div className="form-item flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-slate-600">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <p className="form-item text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
            >
              Login
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          Passwords hashed with bcrypt · Cookies are httpOnly
        </p>
      </div>
    </div>
  );
}
