import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "../store/slices/authSlice.js";
import axiosInstance from "../lib/axios.js";
import {
  Search,
  ArrowUpDown,
  Filter,
  Shuffle,
  CheckCircle2,
  Lock,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "../lib/utils.js";
import Footer from "../components/Footer.jsx";

// ── Fetch all problems ──────────────────────────────────────────────────────
const fetchProblems = async ({ difficulty, tag }) => {
  const params = {};
  if (difficulty) params.difficulty = difficulty;
  if (tag) params.tag = tag;
  const res = await axiosInstance.get("/questions", { params });
  return res.data.data.questions;
};

// ── Fetch solved question IDs for logged-in user ────────────────────────────
const fetchSolved = async () => {
  const res = await axiosInstance.get("/users/solved");
  return new Set(res.data.data.solved.map((s) => s.questionId.toString()));
};

// ── Difficulty badge ─────────────────────────────────────────────────────────
function DifficultyBadge({ difficulty }) {
  const map = {
    easy: "text-emerald-400",
    medium: "text-amber-400",
    hard: "text-red-400",
  };
  const labels = { easy: "Easy", medium: "Med.", hard: "Hard" };
  return (
    <span
      className={cn(
        "text-sm font-semibold",
        map[difficulty] ?? "text-slate-400",
      )}
    >
      {labels[difficulty] ?? difficulty}
    </span>
  );
}

// ── Tag pill ─────────────────────────────────────────────────────────────────
function TagPill({ tag, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150",
        active
          ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
          : "bg-white/3 border-white/10 text-slate-400 hover:border-violet-500/30 hover:text-slate-200",
      )}
    >
      {tag}
    </button>
  );
}

const DIFFICULTIES = ["all", "easy", "medium", "hard"];
const SORT_OPTIONS = [
  { label: "Default", value: "default" },
  { label: "Title A–Z", value: "title_asc" },
  { label: "Title Z–A", value: "title_desc" },
  { label: "Easiest", value: "easy_first" },
  { label: "Hardest", value: "hard_first" },
];

export default function Problems() {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [activeTag, setActiveTag] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const sortRef = useRef(null);
  const filterRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target))
        setSortOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target))
        setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch problems
  const { data: problems = [], isLoading: loadingProblems } = useQuery({
    queryKey: ["problems", difficulty === "all" ? "" : difficulty, activeTag],
    queryFn: () =>
      fetchProblems({
        difficulty: difficulty === "all" ? "" : difficulty,
        tag: activeTag,
      }),
  });

  // Fetch solved (only if logged in)
  // Use the same data shape as other pages: { totalSolved, solved: [...] }
  const { data: solvedData } = useQuery({
    queryKey: ["solved"],
    queryFn: () => axiosInstance.get("/users/solved").then((r) => r.data.data),
    enabled: isAuthenticated,
  });

  // Build a Set of solved question IDs for quick lookup
  const solvedSet = new Set(
    (solvedData?.solved ?? []).map((s) => s.questionId.toString()),
  );

  // All unique tags from problems
  const allTags = [...new Set(problems.flatMap((p) => p.tags ?? []))].sort();

  // Difficulty order helper
  const diffOrder = { easy: 0, medium: 1, hard: 2 };

  // Client-side filter + sort
  const filtered = problems
    .filter((p) => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "title_asc":
          return a.title.localeCompare(b.title);
        case "title_desc":
          return b.title.localeCompare(a.title);
        case "easy_first":
          return (
            (diffOrder[a.difficulty] ?? 1) - (diffOrder[b.difficulty] ?? 1)
          );
        case "hard_first":
          return (
            (diffOrder[b.difficulty] ?? 1) - (diffOrder[a.difficulty] ?? 1)
          );
        default:
          return 0;
      }
    });

  // Shuffle
  const handleShuffle = () => {
    if (!filtered.length) return;
    const random = filtered[Math.floor(Math.random() * filtered.length)];
    window.location.href = `/problems/${random._id}`;
  };

  // Stats
  const hasSolved = (id) => solvedSet.has(id);
  const totalSolved = isAuthenticated
    ? solvedData?.totalSolved ?? solvedSet.size
    : 0;
  const totalProblems = problems.length;

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.value === sortBy)?.label ?? "Default";

  return (
    <div
      className="min-h-screen"
      style={{ background: "#0a0a0f", paddingTop: "64px" }}
    >
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ── Top bar ── */}
        <div
          className="flex items-center gap-3 mb-1 px-4 py-3 rounded-2xl"
          style={{ background: "#13131f", border: "1px solid #1e1e30" }}
        >
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search questions"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm text-slate-200 placeholder:text-slate-600 outline-none transition-all"
              style={{ background: "#0a0a0f", border: "1px solid #1e1e30" }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-colors"
              style={{ background: "#0a0a0f", border: "1px solid #1e1e30" }}
            >
              <ArrowUpDown size={15} />
              <span className="hidden sm:inline">{currentSortLabel}</span>
            </button>
            {sortOpen && (
              <div
                className="absolute top-full mt-2 left-0 w-40 rounded-xl overflow-hidden z-40 shadow-xl"
                style={{ background: "#13131f", border: "1px solid #2d2d45" }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSortBy(opt.value);
                      setSortOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-sm transition-colors",
                      sortBy === opt.value
                        ? "text-violet-400 bg-violet-500/10"
                        : "text-slate-400 hover:text-white hover:bg-white/5",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter (difficulty) */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors",
                difficulty !== "all"
                  ? "text-violet-400 bg-violet-500/10 border-violet-500/30"
                  : "text-slate-400 hover:text-slate-200",
              )}
              style={{
                background: difficulty !== "all" ? undefined : "#0a0a0f",
                border: `1px solid ${difficulty !== "all" ? "#7c3aed50" : "#1e1e30"}`,
              }}
            >
              <Filter size={15} />
              <span className="hidden sm:inline capitalize">
                {difficulty === "all" ? "Filter" : difficulty}
              </span>
            </button>
            {filterOpen && (
              <div
                className="absolute top-full mt-2 right-0 w-44 rounded-xl overflow-hidden z-40 shadow-xl p-2"
                style={{ background: "#13131f", border: "1px solid #2d2d45" }}
              >
                <p className="text-xs text-slate-600 uppercase tracking-wider px-2 pb-2 font-semibold">
                  Difficulty
                </p>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setDifficulty(d);
                      setFilterOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors capitalize",
                      difficulty === d
                        ? "text-violet-400 bg-violet-500/10"
                        : "text-slate-400 hover:text-white hover:bg-white/5",
                    )}
                  >
                    {d === "all" ? "All Difficulties" : d}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Solved counter */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
            style={{ background: "#0a0a0f", border: "1px solid #1e1e30" }}
          >
            <div className="w-4 h-4 rounded-full border-2 border-slate-600 flex items-center justify-center">
              <div
                className="rounded-full bg-violet-500 transition-all"
                style={{
                  width: totalProblems
                    ? `${(Math.round((totalSolved / totalProblems) * 100) / 100) * 12}px`
                    : "0px",
                  height: totalProblems
                    ? `${(Math.round((totalSolved / totalProblems) * 100) / 100) * 12}px`
                    : "0px",
                }}
              />
            </div>
            <span className="text-slate-400 font-medium">
              {totalSolved}/{totalProblems} Solved
            </span>
          </div>

          {/* Shuffle */}
          <button
            onClick={handleShuffle}
            title="Pick random problem"
            className="p-2 rounded-xl text-slate-400 hover:text-violet-400 transition-colors"
            style={{ background: "#0a0a0f", border: "1px solid #1e1e30" }}
          >
            <Shuffle size={15} />
          </button>
        </div>

        {/* ── Tag filters ── */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 mb-4 px-1">
            {activeTag && (
              <button
                onClick={() => setActiveTag("")}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-violet-500/20 border border-violet-500/40 text-violet-300"
              >
                <X size={10} /> Clear tag
              </button>
            )}
            {allTags.map((tag) => (
              <TagPill
                key={tag}
                tag={tag}
                active={activeTag === tag}
                onClick={() => setActiveTag(activeTag === tag ? "" : tag)}
              />
            ))}
          </div>
        )}

        {/* ── Problem list ── */}
        <div
          className="mt-2 rounded-2xl overflow-hidden"
          style={{ border: "1px solid #1e1e30" }}
        >
          {/* Header row */}
          <div
            className="grid items-center px-6 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider"
            style={{
              gridTemplateColumns: "2rem 1fr 8rem 6rem 5rem",
              background: "#0d0d1a",
              borderBottom: "1px solid #1e1e30",
            }}
          >
            <span />
            <span>Title</span>
            <span className="text-right">Acceptance</span>
            <span className="text-right">Difficulty</span>
            <span className="text-right">Status</span>
          </div>

          {/* Rows */}
          {loadingProblems ? (
            // Skeleton
            <div style={{ background: "#0d0d1a" }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="grid items-center px-6 py-4 animate-pulse"
                  style={{
                    gridTemplateColumns: "2rem 1fr 8rem 6rem 5rem",
                    borderBottom: i < 11 ? "1px solid #1a1a28" : "none",
                    background: i % 2 === 0 ? "#0d0d1a" : "#0f0f1e",
                  }}
                >
                  <div className="w-4 h-4 rounded bg-slate-800" />
                  <div className="h-4 w-2/3 rounded bg-slate-800" />
                  <div className="h-3 w-12 rounded bg-slate-800 ml-auto" />
                  <div className="h-3 w-10 rounded bg-slate-800 ml-auto" />
                  <div className="h-4 w-4 rounded bg-slate-800 ml-auto" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-24 text-center"
              style={{ background: "#0d0d1a" }}
            >
              <Search size={40} className="text-slate-700 mb-4" />
              <p className="text-slate-500 text-sm font-medium">
                No problems found
              </p>
              <p className="text-slate-700 text-xs mt-1">
                Try adjusting your search or filters
              </p>
              {(search || difficulty !== "all" || activeTag) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setDifficulty("all");
                    setActiveTag("");
                  }}
                  className="mt-4 px-4 py-2 rounded-lg text-xs text-violet-400 border border-violet-500/30 hover:bg-violet-500/10 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            filtered.map((problem, idx) => {
              const isSolved = hasSolved(problem._id.toString());
              const isEven = idx % 2 === 0;

              // Fake acceptance rate — backend doesn't expose it yet, show placeholder
              const acceptanceRate = problem.acceptanceRate
                ? `${problem.acceptanceRate.toFixed(1)}%`
                : "—";

              return (
                <Link
                  key={problem._id}
                  to={`/problems/${problem._id}`}
                  className="grid items-center px-6 py-4 transition-all duration-150 group"
                  style={{
                    gridTemplateColumns: "2rem 1fr 8rem 6rem 5rem",
                    background: isEven ? "#0d0d1a" : "#0f0f1e",
                    borderBottom:
                      idx < filtered.length - 1 ? "1px solid #1a1a28" : "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#141428";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isEven
                      ? "#0d0d1a"
                      : "#0f0f1e";
                  }}
                >
                  {/* Index */}
                  <span className="text-xs text-slate-700 font-mono select-none">
                    {idx + 1}
                  </span>

                  {/* Title */}
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors truncate pr-4">
                    {problem.title}
                    {/* Tags inline (small, subtle) */}
                    {problem.tags?.length > 0 && (
                      <span className="ml-2 hidden lg:inline-flex gap-1">
                        {problem.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded text-[10px] text-slate-600 font-medium"
                            style={{ background: "#1a1a2e" }}
                          >
                            {tag}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>

                  {/* Acceptance rate */}
                  <span className="text-sm text-slate-500 text-right tabular-nums">
                    {acceptanceRate}
                  </span>

                  {/* Difficulty */}
                  <span className="text-right">
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </span>

                  {/* Status — solved checkmark or lock */}
                  <span className="flex justify-end">
                    {isSolved ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : (
                      <Lock
                        size={15}
                        className="text-slate-700 group-hover:text-slate-500 transition-colors"
                      />
                    )}
                  </span>
                </Link>
              );
            })
          )}
        </div>

        {/* Result count */}
        {!loadingProblems && filtered.length > 0 && (
          <p className="text-xs text-slate-700 mt-3 px-1">
            Showing {filtered.length} of {totalProblems} problems
            {(search || difficulty !== "all" || activeTag) && " (filtered)"}
          </p>
        )}
      </div>

      <Footer />
    </div>
  );
}
