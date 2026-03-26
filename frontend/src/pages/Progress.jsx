import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "../store/slices/authSlice.js";
import axiosInstance from "../lib/axios.js";
import {
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  X,
  BarChart2,
} from "lucide-react";
import { cn } from "../lib/utils.js";
import Footer from "../components/Footer.jsx";

// ── API ──────────────────────────────────────────────────────────────────────
const fetchStats = () =>
  axiosInstance.get("/users/stats").then((r) => r.data.data);
const fetchSolved = () =>
  axiosInstance.get("/users/solved").then((r) => r.data.data);
const fetchHistory = (page) =>
  axiosInstance
    .get(`/users/submissions?page=${page}&limit=10`)
    .then((r) => r.data.data);

// ── Difficulty badge inline ───────────────────────────────────────────────────
function DiffLabel({ difficulty }) {
  const map = {
    easy: "text-emerald-400",
    medium: "text-amber-400",
    hard: "text-red-400",
  };
  return (
    <span
      className={cn(
        "text-xs font-semibold capitalize",
        map[difficulty] ?? "text-slate-400",
      )}
    >
      {difficulty}
    </span>
  );
}

// ── Mini bubble chart for tags ───────────────────────────────────────────────
function TagBubbles({ solved }) {
  const tagCount = {};
  (solved ?? []).forEach((s) => {
    (s.tags ?? []).forEach((t) => {
      tagCount[t] = (tagCount[t] ?? 0) + 1;
    });
  });
  const tags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  if (!tags.length)
    return (
      <p className="text-xs text-slate-600 text-center py-8">
        Solve tagged problems to see breakdown
      </p>
    );

  const max = tags[0][1];
  const colors = [
    "#7c3aed",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ec4899",
    "#8b5cf6",
    "#14b8a6",
    "#f97316",
  ];

  return (
    <div className="relative h-48 flex items-center justify-center flex-wrap gap-3 px-4">
      {tags.map(([tag, count], i) => {
        const size = 48 + (count / max) * 60;
        return (
          <div
            key={tag}
            className="rounded-full flex items-center justify-center text-center cursor-default transition-transform hover:scale-105"
            style={{
              width: size,
              height: size,
              background: `${colors[i % colors.length]}18`,
              border: `1px solid ${colors[i % colors.length]}30`,
            }}
            title={`${tag}: ${count}`}
          >
            <span className="text-[10px] font-medium text-slate-400 px-1 leading-tight text-center">
              {tag}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Expandable solved row ────────────────────────────────────────────────────
function SolvedRow({ item, index }) {
  const [open, setOpen] = useState(false);
  const date = new Date(item.solvedAt);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <>
      <tr
        className="transition-colors cursor-pointer group"
        style={{ background: index % 2 === 0 ? "#0d0d1a" : "#0f0f1e" }}
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-5 py-3.5 text-sm text-slate-500 whitespace-nowrap">
          {dateStr}
        </td>
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2">
            <CheckCircle2
              size={14}
              className="text-emerald-400 flex-shrink-0"
            />
            <div>
              <Link
                to={`/problems/${item.questionId}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-semibold text-slate-200 hover:text-violet-400 transition-colors"
              >
                {item.title}
              </Link>
              <div className="mt-0.5">
                <DiffLabel difficulty={item.difficulty} />
              </div>
            </div>
          </div>
        </td>
        <td className="px-5 py-3.5 text-sm text-emerald-400 font-medium">
          Accepted
        </td>
        <td className="px-5 py-3.5 text-sm text-slate-400">1</td>
        <td className="px-5 py-3.5">
          <ChevronDown
            size={14}
            className={cn(
              "text-slate-600 transition-transform",
              open && "rotate-180",
            )}
          />
        </td>
      </tr>
      {open && (
        <tr style={{ background: "#0a0a0f" }}>
          <td colSpan={5} className="px-5 py-3">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs text-slate-500">
                Language:{" "}
                <span className="text-slate-300 capitalize">
                  {item.language}
                </span>
              </span>
              <span className="text-xs text-slate-500">
                Solved:{" "}
                <span className="text-slate-300">
                  {new Date(item.solvedAt).toLocaleString()}
                </span>
              </span>
              {item.tags?.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded text-[10px] text-slate-500"
                      style={{ background: "#1a1a2e" }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <Link
                to={`/problems/${item.questionId}`}
                className="text-xs text-violet-400 hover:text-violet-300 ml-auto"
              >
                Solve again →
              </Link>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Progress() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [diffFilter, setDiffFilter] = useState("all");

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    enabled: isAuthenticated,
  });
  const { data: solved } = useQuery({
    queryKey: ["solved"],
    queryFn: fetchSolved,
    enabled: isAuthenticated,
  });
  const { data: history, isLoading } = useQuery({
    queryKey: ["submissions-paged", page],
    queryFn: () => fetchHistory(page),
    enabled: isAuthenticated,
    keepPreviousData: true,
  });

  if (!isAuthenticated)
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-4"
        style={{ background: "#0a0a0f" }}
      >
        <p className="text-slate-400">Please login to view your progress.</p>
        <Link to="/login" className="text-violet-400 text-sm">
          Login →
        </Link>
      </div>
    );

  const solvedList = solved?.solved ?? [];
  const totalSolved = stats?.totalSolved ?? 0;
  const easy = stats?.solvedByDifficulty?.easy ?? 0;
  const medium = stats?.solvedByDifficulty?.medium ?? 0;
  const hard = stats?.solvedByDifficulty?.hard ?? 0;
  const totalSubmissions = stats?.totalSubmissions ?? 0;
  const acceptanceRate = stats?.acceptanceRate ?? "0%";

  const filteredSolved =
    diffFilter === "all"
      ? solvedList
      : solvedList.filter((s) => s.difficulty === diffFilter);

  const totalPages = history?.totalPages ?? 1;

  return (
    <div
      style={{ background: "#0a0a0f", minHeight: "100vh", paddingTop: "64px" }}
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* ══ LEFT — Practice History ══ */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-black text-white">
                Practice History
              </h1>
              {/* Filter */}
              <div className="relative">
                <button
                  onClick={() => setFilterOpen((v) => !v)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-colors",
                    diffFilter !== "all"
                      ? "text-violet-400 bg-violet-500/10 border-violet-500/30"
                      : "text-slate-400",
                  )}
                  style={{
                    border: "1px solid #2d2d45",
                    background: diffFilter !== "all" ? undefined : "#0d0d1a",
                  }}
                >
                  <Filter size={13} />
                  {diffFilter === "all"
                    ? "Filter"
                    : diffFilter.charAt(0).toUpperCase() + diffFilter.slice(1)}
                </button>
                {filterOpen && (
                  <div
                    className="absolute right-0 top-full mt-1.5 w-44 rounded-xl overflow-hidden z-40 shadow-xl py-1"
                    style={{
                      background: "#13131f",
                      border: "1px solid #2d2d45",
                    }}
                  >
                    {["all", "easy", "medium", "hard"].map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          setDiffFilter(d);
                          setFilterOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-sm capitalize transition-colors",
                          diffFilter === d
                            ? "text-violet-400 bg-violet-500/10"
                            : "text-slate-400 hover:text-white hover:bg-white/5",
                        )}
                      >
                        {d === "all" ? "All Difficulties" : d}
                      </button>
                    ))}
                    {diffFilter !== "all" && (
                      <button
                        onClick={() => {
                          setDiffFilter("all");
                          setFilterOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-600 hover:text-slate-400 border-t border-[#1e1e30]"
                      >
                        <X size={11} /> Clear filter
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ border: "1px solid #1e1e30" }}
            >
              <table className="w-full">
                <thead>
                  <tr
                    style={{
                      background: "#0d0d1a",
                      borderBottom: "1px solid #1e1e30",
                    }}
                  >
                    {[
                      "Last Submitted",
                      "Problem",
                      "Last Result",
                      "Submissions",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}{" "}
                        {h && h !== "" && (
                          <span className="inline-block ml-0.5 opacity-40">
                            ↕
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSolved.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-16 text-slate-600 text-sm"
                        style={{ background: "#0d0d1a" }}
                      >
                        {diffFilter !== "all"
                          ? "No solved problems with this filter"
                          : "No solved problems yet"}
                      </td>
                    </tr>
                  ) : (
                    filteredSolved.map((item, i) => (
                      <SolvedRow
                        key={item.submissionId}
                        item={item}
                        index={i}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                style={{ border: "1px solid #1e1e30", background: "#0d0d1a" }}
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-9 h-9 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: page === p ? "#7c3aed" : "#0d0d1a",
                      color: page === p ? "white" : "#64748b",
                      border: `1px solid ${page === p ? "#7c3aed" : "#1e1e30"}`,
                    }}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                style={{ border: "1px solid #1e1e30", background: "#0d0d1a" }}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* ══ RIGHT — Summary ══ */}
          <div className="space-y-4">
            <h2 className="text-xl font-black text-white">Summary</h2>

            {/* Year banner */}
            <div
              className="rounded-2xl px-5 py-4 flex items-center justify-between overflow-hidden relative"
              style={{
                background: "linear-gradient(135deg, #1e1b4b, #312e81)",
                border: "1px solid #3730a3",
              }}
            >
              <span className="text-3xl font-black text-white">
                {new Date().getFullYear()}
              </span>
              <span className="text-3xl opacity-20">❄️</span>
            </div>

            {/* Total solved breakdown */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "#0d0d1a", border: "1px solid #1e1e30" }}
            >
              <p className="text-sm text-slate-500 mb-2">Total Solved</p>
              <p className="text-3xl font-black text-cyan-400 mb-3">
                {totalSolved}{" "}
                <span className="text-sm font-normal text-slate-500">
                  Problems
                </span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Easy",
                    val: easy,
                    color: "#10b981",
                    bg: "#10b98115",
                  },
                  {
                    label: "Med.",
                    val: medium,
                    color: "#f59e0b",
                    bg: "#f59e0b15",
                  },
                  {
                    label: "Hard",
                    val: hard,
                    color: "#ef4444",
                    bg: "#ef444415",
                  },
                ].map((d) => (
                  <div
                    key={d.label}
                    className="rounded-xl p-2.5 text-center"
                    style={{ background: d.bg }}
                  >
                    <p className="text-xs text-slate-500 mb-1">{d.label}</p>
                    <p
                      className="text-lg font-black"
                      style={{ color: d.color }}
                    >
                      {d.val}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Submissions + Acceptance */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-2xl p-4"
                style={{ background: "#0d0d1a", border: "1px solid #1e1e30" }}
              >
                <p className="text-xs text-slate-500 mb-1">Submissions</p>
                <p className="text-2xl font-black text-violet-400">
                  {totalSubmissions}
                </p>
              </div>
              <div
                className="rounded-2xl p-4"
                style={{ background: "#0d0d1a", border: "1px solid #1e1e30" }}
              >
                <p className="text-xs text-slate-500 mb-1">Acceptance</p>
                <p className="text-2xl font-black text-emerald-400">
                  {acceptanceRate}
                </p>
              </div>
            </div>

            {/* Tag bubbles */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "#0d0d1a", border: "1px solid #1e1e30" }}
            >
              <p className="text-sm font-bold text-white mb-3">
                Topic Breakdown
              </p>
              <TagBubbles solved={solvedList} />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
