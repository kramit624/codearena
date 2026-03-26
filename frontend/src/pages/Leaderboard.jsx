import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrentUser } from "../store/slices/authSlice.js";
import axiosInstance from "../lib/axios.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Trophy,
  Medal,
  Crown,
  Flame,
  TrendingUp,
  Code2,
  Star,
  ChevronUp,
  ChevronDown,
  Minus,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { cn } from "../lib/utils.js";
import Footer from "../components/Footer.jsx";

gsap.registerPlugin(ScrollTrigger);

// ── Fetch all users stats for leaderboard ────────────────────────────────────
// Since we don't have a dedicated leaderboard endpoint yet,
// we fetch all solved questions per user via the problems list
// and build rankings from our own stats endpoint for the current user.
// For the leaderboard we call a custom endpoint — wire this up in your backend.
const fetchLeaderboard = async () => {
  const res = await axiosInstance.get("/users/leaderboard");
  return res.data.data;
};

// ── Rank badge ───────────────────────────────────────────────────────────────
function RankBadge({ rank }) {
  if (rank === 1)
    return (
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
          boxShadow: "0 0 12px #f59e0b50",
        }}
      >
        <Crown size={14} className="text-white" />
      </div>
    );
  if (rank === 2)
    return (
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #94a3b8, #64748b)",
          boxShadow: "0 0 10px #94a3b840",
        }}
      >
        <Medal size={14} className="text-white" />
      </div>
    );
  if (rank === 3)
    return (
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #f97316, #ea580c)",
          boxShadow: "0 0 10px #f9731640",
        }}
      >
        <Medal size={14} className="text-white" />
      </div>
    );
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: "#13131f", border: "1px solid #2d2d45" }}
    >
      <span className="text-xs font-bold text-slate-400">{rank}</span>
    </div>
  );
}

// ── Rank change indicator ─────────────────────────────────────────────────────
function RankChange({ change }) {
  if (!change || change === 0)
    return (
      <span className="flex items-center gap-0.5 text-xs text-slate-600">
        <Minus size={10} /> —
      </span>
    );
  if (change > 0)
    return (
      <span className="flex items-center gap-0.5 text-xs text-emerald-400 font-medium">
        <ChevronUp size={12} /> {change}
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-xs text-red-400 font-medium">
      <ChevronDown size={12} /> {Math.abs(change)}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ username, size = "md", rank }) {
  const gradients = [
    "from-violet-600 to-cyan-500",
    "from-pink-500 to-violet-600",
    "from-cyan-500 to-emerald-500",
    "from-amber-500 to-pink-500",
    "from-emerald-500 to-cyan-600",
  ];
  const idx = username?.charCodeAt(0) % gradients.length ?? 0;
  const sz = size === "lg" ? "w-12 h-12 text-lg" : "w-8 h-8 text-xs";

  return (
    <div
      className={cn(
        `${sz} rounded-full bg-gradient-to-br flex items-center justify-center font-black text-white flex-shrink-0`,
        gradients[idx],
      )}
    >
      {username?.[0]?.toUpperCase() ?? "U"}
    </div>
  );
}

// ── Difficulty dots ───────────────────────────────────────────────────────────
function DiffDots({ easy, medium, hard }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
        <span className="text-slate-500">{easy}</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
        <span className="text-slate-500">{medium}</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
        <span className="text-slate-500">{hard}</span>
      </span>
    </div>
  );
}

// ── Top 3 podium ──────────────────────────────────────────────────────────────
function Podium({ top3 }) {
  const podiumRef = useRef(null);

  useEffect(() => {
    if (!podiumRef.current) return;
    gsap.fromTo(
      podiumRef.current.querySelectorAll(".podium-card"),
      { opacity: 0, y: 40, scale: 0.9 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.15,
        ease: "back.out(1.5)",
        delay: 0.3,
      },
    );
  }, [top3]);

  if (!top3?.length) return null;

  const order = [top3[1], top3[0], top3[2]].filter(Boolean); // 2nd, 1st, 3rd
  const heights = ["h-24", "h-32", "h-20"];
  const labels = ["2nd", "1st", "3rd"];
  const glows = [
    "rgba(148,163,184,0.2)",
    "rgba(251,191,36,0.3)",
    "rgba(249,115,22,0.2)",
  ];

  return (
    <div
      ref={podiumRef}
      className="flex items-end justify-center gap-4 mb-10 px-4"
    >
      {order.map((user, i) => {
        if (!user) return null;
        const isFirst = labels[i] === "1st";
        return (
          <div
            key={user.username}
            className="podium-card flex flex-col items-center gap-3 flex-1 max-w-[200px]"
          >
            {/* Crown for 1st */}
            {isFirst && (
              <Crown size={20} className="text-amber-400 animate-bounce" />
            )}

            {/* Avatar + name */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <Avatar username={user.username} size="lg" rank={user.rank} />
                {isFirst && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                    <span className="text-[9px] font-black text-amber-900">
                      1
                    </span>
                  </div>
                )}
              </div>
              <div className="text-center">
                <p
                  className={cn(
                    "font-bold truncate max-w-[120px]",
                    isFirst ? "text-white text-base" : "text-slate-300 text-sm",
                  )}
                >
                  {user.username}
                </p>
                <p className="text-xs text-slate-500">
                  {user.totalSolved} solved
                </p>
              </div>
            </div>

            {/* Podium block */}
            <div
              className={cn(
                "w-full rounded-t-xl flex items-center justify-center",
                heights[i],
              )}
              style={{
                background: `linear-gradient(180deg, ${glows[i]}, #0d0d1a)`,
                border: "1px solid #1e1e30",
                borderBottom: "none",
                boxShadow: `0 -4px 20px ${glows[i]}`,
              }}
            >
              <span
                className={cn(
                  "text-2xl font-black",
                  isFirst
                    ? "text-amber-400"
                    : i === 1
                      ? "text-slate-400"
                      : "text-orange-400",
                )}
              >
                {labels[i]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Leaderboard() {
  const currentUser = useSelector(selectCurrentUser);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("totalSolved");
  const tableRef = useRef(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    retry: false,
  });

  // Animate rows on load
  useEffect(() => {
    if (!tableRef.current || isLoading) return;
    gsap.fromTo(
      tableRef.current.querySelectorAll(".lb-row"),
      { opacity: 0, x: -20 },
      {
        opacity: 1,
        x: 0,
        duration: 0.4,
        stagger: 0.04,
        ease: "power2.out",
        delay: 0.1,
      },
    );
  }, [data, isLoading]);

  // Sort + filter
  const users = data?.users ?? [];
  const filtered = users
    .filter((u) => u.username.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "totalSolved") return b.totalSolved - a.totalSolved;
      if (sortBy === "acceptanceRate")
        return parseFloat(b.acceptanceRate) - parseFloat(a.acceptanceRate);
      if (sortBy === "totalSubmissions")
        return b.totalSubmissions - a.totalSubmissions;
      if (sortBy === "hard")
        return (
          (b.solvedByDifficulty?.hard ?? 0) - (a.solvedByDifficulty?.hard ?? 0)
        );
      return 0;
    })
    .map((u, i) => ({ ...u, rank: i + 1 }));

  const top3 = filtered.slice(0, 3);

  // Find current user's rank
  const myRank = currentUser
    ? filtered.findIndex((u) => u.username === currentUser.username) + 1
    : 0;

  const SORT_OPTIONS = [
    { label: "Most Solved", value: "totalSolved" },
    { label: "Acceptance %", value: "acceptanceRate" },
    { label: "Submissions", value: "totalSubmissions" },
    { label: "Hard Problems", value: "hard" },
  ];

  return (
    <div
      style={{ background: "#0a0a0f", minHeight: "100vh", paddingTop: "64px" }}
    >
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* ── Page header ── */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-amber-400 mb-4"
            style={{ background: "#f59e0b15", border: "1px solid #f59e0b30" }}
          >
            <Trophy size={12} />
            Leaderboard
          </div>
          <h1 className="text-4xl font-black text-white mb-3">
            Who's on <span className="gradient-text">top?</span>
          </h1>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Rankings based on total problems solved. Climb the ladder — one
            submission at a time.
          </p>
        </div>

        {/* ── Current user rank banner ── */}
        {currentUser && myRank > 0 && (
          <div
            className="flex items-center gap-4 px-5 py-3.5 rounded-2xl mb-6"
            style={{ background: "#7c3aed15", border: "1px solid #7c3aed30" }}
          >
            <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
              <Star size={14} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">
                Your current rank
              </p>
              <p className="text-xs text-slate-500">
                Keep solving to climb higher
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-violet-400">#{myRank}</p>
              <p className="text-xs text-slate-600">
                of {filtered.length} coders
              </p>
            </div>
          </div>
        )}

        {/* ── Podium ── */}
        {!isLoading && !error && top3.length >= 2 && <Podium top3={top3} />}

        {/* ── Controls ── */}
        <div
          className="flex items-center gap-3 mb-4 px-4 py-3 rounded-2xl flex-wrap"
          style={{ background: "#0d0d1a", border: "1px solid #1e1e30" }}
        >
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 rounded-xl text-sm text-slate-200 placeholder:text-slate-700 outline-none"
              style={{ background: "#0a0a0f", border: "1px solid #1e1e30" }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Sort pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  sortBy === opt.value
                    ? "text-violet-300 bg-violet-500/15 border-violet-500/30"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5",
                )}
                style={{
                  border: `1px solid ${sortBy === opt.value ? "#7c3aed50" : "#1e1e30"}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid #1e1e30" }}
        >
          {/* Header */}
          <div
            className="grid items-center px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider"
            style={{
              gridTemplateColumns: "3rem 1fr 7rem 7rem 7rem 6rem",
              background: "#0d0d1a",
              borderBottom: "1px solid #1e1e30",
            }}
          >
            <span>Rank</span>
            <span>User</span>
            <span className="text-center">Solved</span>
            <span className="text-center hidden sm:block">Submissions</span>
            <span className="text-center hidden md:block">Acceptance</span>
            <span className="text-center hidden md:block">Breakdown</span>
          </div>

          {/* Loading */}
          {isLoading && (
            <div style={{ background: "#0d0d1a" }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="grid items-center px-5 py-4 animate-pulse"
                  style={{
                    gridTemplateColumns: "3rem 1fr 7rem 7rem 7rem 6rem",
                    borderBottom: "1px solid #1a1a28",
                    background: i % 2 === 0 ? "#0d0d1a" : "#0f0f1e",
                  }}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-800" />
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800" />
                    <div className="h-4 w-28 rounded bg-slate-800" />
                  </div>
                  <div className="h-4 w-10 rounded bg-slate-800 mx-auto" />
                  <div className="h-4 w-10 rounded bg-slate-800 mx-auto hidden sm:block" />
                  <div className="h-4 w-12 rounded bg-slate-800 mx-auto hidden md:block" />
                  <div className="h-4 w-16 rounded bg-slate-800 mx-auto hidden md:block" />
                </div>
              ))}
            </div>
          )}

          {/* Error — no endpoint yet */}
          {error && (
            <div
              className="flex flex-col items-center justify-center py-20 gap-4"
              style={{ background: "#0d0d1a" }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: "#7c3aed15",
                  border: "1px solid #7c3aed30",
                }}
              >
                <Trophy size={24} className="text-violet-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-bold mb-1">
                  Leaderboard Coming Soon
                </p>
                <p className="text-slate-500 text-sm max-w-xs">
                  The{" "}
                  <code className="text-violet-400 text-xs bg-violet-500/10 px-1.5 py-0.5 rounded">
                    GET /api/v1/users/leaderboard
                  </code>{" "}
                  endpoint needs to be added to your backend.
                </p>
              </div>
              <div
                className="px-4 py-3 rounded-xl text-xs font-mono text-slate-400 max-w-sm text-left"
                style={{ background: "#0a0a0f", border: "1px solid #1e1e30" }}
              >
                <p className="text-violet-400 mb-1">// Add to user.route.js</p>
                <p>
                  router.get(
                  <span className="text-emerald-400">"/leaderboard"</span>,
                  getLeaderboard);
                </p>
                <br />
                <p className="text-violet-400 mb-1">// user.controller.js</p>
                <p>{"export const getLeaderboard = async (req, res) => {"}</p>
                <p className="pl-4 text-slate-500">
                  {"// aggregate all users' stats"}
                </p>
                <p className="pl-4">
                  {"const users = await Submission.aggregate([...]);"}
                </p>
                <p>{"}"}</p>
              </div>
            </div>
          )}

          {/* Empty search */}
          {!isLoading && !error && filtered.length === 0 && (
            <div
              className="flex flex-col items-center justify-center py-16 gap-2"
              style={{ background: "#0d0d1a" }}
            >
              <Search size={32} className="text-slate-700" />
              <p className="text-slate-500 text-sm">
                No users found for "{search}"
              </p>
              <button
                onClick={() => setSearch("")}
                className="text-xs text-violet-400 hover:text-violet-300 mt-1"
              >
                Clear search
              </button>
            </div>
          )}

          {/* Rows */}
          {!isLoading && !error && (
            <div ref={tableRef}>
              {filtered.map((user, idx) => {
                const isMe = user.username === currentUser?.username;
                const isEven = idx % 2 === 0;

                return (
                  <div
                    key={user.username}
                    className="lb-row grid items-center px-5 py-3.5 transition-all duration-150 group"
                    style={{
                      gridTemplateColumns: "3rem 1fr 7rem 7rem 7rem 6rem",
                      background: isMe
                        ? "#7c3aed12"
                        : isEven
                          ? "#0d0d1a"
                          : "#0f0f1e",
                      borderBottom:
                        idx < filtered.length - 1
                          ? "1px solid #1a1a28"
                          : "none",
                      borderLeft: isMe
                        ? "3px solid #7c3aed"
                        : "3px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!isMe) e.currentTarget.style.background = "#141428";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isMe
                        ? "#7c3aed12"
                        : isEven
                          ? "#0d0d1a"
                          : "#0f0f1e";
                    }}
                  >
                    {/* Rank */}
                    <div className="flex items-center">
                      <RankBadge rank={user.rank} />
                    </div>

                    {/* User */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar username={user.username} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              "text-sm font-semibold truncate group-hover:text-white transition-colors",
                              isMe ? "text-violet-300" : "text-slate-200",
                            )}
                          >
                            {user.username}
                          </p>
                          {isMe && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold text-violet-400 flex-shrink-0"
                              style={{
                                background: "#7c3aed20",
                                border: "1px solid #7c3aed40",
                              }}
                            >
                              You
                            </span>
                          )}
                          {user.rank <= 3 && (
                            <Flame
                              size={12}
                              className="text-amber-400 flex-shrink-0"
                            />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 truncate">
                          {user.email ?? ""}
                        </p>
                      </div>
                    </div>

                    {/* Total solved */}
                    <div className="text-center">
                      <p
                        className={cn(
                          "text-sm font-black",
                          user.rank === 1
                            ? "text-amber-400"
                            : user.rank === 2
                              ? "text-slate-300"
                              : user.rank === 3
                                ? "text-orange-400"
                                : "text-white",
                        )}
                      >
                        {user.totalSolved ?? 0}
                      </p>
                    </div>

                    {/* Submissions */}
                    <div className="text-center hidden sm:block">
                      <p className="text-sm text-slate-400">
                        {user.totalSubmissions ?? 0}
                      </p>
                    </div>

                    {/* Acceptance */}
                    <div className="text-center hidden md:block">
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          parseFloat(user.acceptanceRate) >= 70
                            ? "text-emerald-400"
                            : parseFloat(user.acceptanceRate) >= 40
                              ? "text-amber-400"
                              : "text-red-400",
                        )}
                      >
                        {user.acceptanceRate ?? "0%"}
                      </p>
                    </div>

                    {/* Difficulty breakdown */}
                    <div className="hidden md:flex justify-center">
                      <DiffDots
                        easy={user.solvedByDifficulty?.easy ?? 0}
                        medium={user.solvedByDifficulty?.medium ?? 0}
                        hard={user.solvedByDifficulty?.hard ?? 0}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Result count */}
        {!isLoading && !error && filtered.length > 0 && (
          <p className="text-xs text-slate-700 mt-3 px-1">
            {filtered.length} coder{filtered.length !== 1 ? "s" : ""} ranked
            {search && ` matching "${search}"`}
          </p>
        )}
      </div>
      <Footer />
    </div>
  );
}
