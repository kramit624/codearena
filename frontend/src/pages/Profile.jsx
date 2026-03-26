import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import {
  selectCurrentUser,
  selectIsAuthenticated,
} from "../store/slices/authSlice.js";
import axiosInstance from "../lib/axios.js";
import {
  User,
  BarChart2,
  CheckCircle2,
  Code2,
  Zap,
  Star,
  Clock,
  ArrowRight,
  Code,
} from "lucide-react";
import { cn } from "../lib/utils.js";
import Footer from "../components/Footer.jsx";

// ── API ──────────────────────────────────────────────────────────────────────
const fetchStats = () =>
  axiosInstance.get("/users/stats").then((r) => r.data.data);
const fetchSolved = () =>
  axiosInstance.get("/users/solved").then((r) => r.data.data);
const fetchHistory = () =>
  axiosInstance.get("/users/submissions?limit=5").then((r) => r.data.data);
const fetchHeatmap = () =>
  axiosInstance.get("/users/submissions/heatmap").then((r) => r.data.data);

// ── Donut chart (SVG) ────────────────────────────────────────────────────────
function DonutChart({ easy, medium, hard, total, solved }) {
  const size = 160;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const segments = [
    { value: easy, color: "#10b981" },
    { value: medium, color: "#f59e0b" },
    { value: hard, color: "#ef4444" },
  ];

  let offset = 0;
  const arcs = segments.map((seg) => {
    const pct = total > 0 ? seg.value / total : 0;
    const dash = pct * circ;
    const gap = circ - dash;
    const el = (
      <circle
        key={seg.color}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={seg.value > 0 ? seg.color : "transparent"}
        strokeWidth={stroke}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "center",
          transition: "stroke-dasharray 1s ease",
        }}
      />
    );
    offset += dash + (seg.value > 0 ? 4 : 0);
    return el;
  });

  return (
    <div className="relative inline-block">
      <svg width={size} height={size}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#1e1e30"
          strokeWidth={stroke}
        />
        {arcs}
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white">{solved}</span>
        <span className="text-xs text-slate-500 mt-0.5">/ {total}</span>
        <span className="text-xs text-emerald-400 font-semibold mt-0.5">
          Solved
        </span>
      </div>
    </div>
  );
}

// ── Heatmap ──────────────────────────────────────────────────────────────────
// ── Heatmap ──────────────────────────────────────────────────────────────────
function Heatmap({ submissions }) {
  const dateMap = {};
  (submissions ?? []).forEach((sub) => {
    const d = new Date(sub.submittedAt).toISOString().slice(0, 10);
    dateMap[d] = (dateMap[d] ?? 0) + 1;
  });

  const totalCount = Object.values(dateMap).reduce((a, b) => a + b, 0);
  const totalActive = Object.keys(dateMap).length;

  // Always render exactly 53 columns × 7 rows
  // Column 0 = oldest week, column 52 = current week
  // Row 0 = Sunday, Row 6 = Saturday
  const COLS = 53;
  const ROWS = 7;
  const CELL = 13;
  const GAP = 3;
  const STEP = CELL + GAP;

  // Find the Sunday that starts the current week
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentDayOfWeek = today.getDay(); // 0=Sun, 6=Sat

  // The grid ends on the Saturday of current week
  const gridEnd = new Date(today);
  gridEnd.setDate(today.getDate() + (6 - currentDayOfWeek));

  // The grid starts 53 weeks before gridEnd Sunday
  const gridStart = new Date(gridEnd);
  gridStart.setDate(gridEnd.getDate() - COLS * ROWS + 1);

  // Build a 2D array: grid[col][row]
  // col = week index (0 = oldest), row = day of week (0=Sun)
  const grid = Array.from({ length: COLS }, () => Array(ROWS).fill(null));

  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + col * 7 + row);
      if (d > today) {
        grid[col][row] = null; // future — don't render
      } else {
        const key = d.toISOString().slice(0, 10);
        grid[col][row] = { date: key, count: dateMap[key] ?? 0 };
      }
    }
  }

  // Month labels — place at first column where a new month starts
  const monthLabels = [];
  let lastMonth = -1;
  for (let col = 0; col < COLS; col++) {
    // find first non-null cell in this column
    const firstCell = grid[col].find((c) => c !== null);
    if (!firstCell) continue;
    const month = new Date(firstCell.date + "T00:00:00").getMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      const label = new Date(firstCell.date + "T00:00:00").toLocaleString(
        "en-US",
        { month: "short" },
      );
      monthLabels.push({ col, label });
    }
  }

  // Filter month labels so they are not too close together in pixels
  const minLabelSpacing = 36; // px - tweak for desired spacing
  const filteredMonthLabels = [];
  let lastLabelX = -Infinity;
  for (const m of monthLabels) {
    const x = m.col * STEP;
    if (filteredMonthLabels.length === 0 || x - lastLabelX >= minLabelSpacing) {
      filteredMonthLabels.push({ ...m, x });
      lastLabelX = x;
    }
  }

  

  const cellColor = (count) => {
    if (count === 0) return "#1e1e30";
    if (count === 1) return "#4c1d95";
    if (count <= 3) return "#7c3aed";
    return "#a78bfa";
  };

  const svgW = COLS * STEP - GAP;
  const svgH = ROWS * STEP - GAP + 24; // +24 for month labels

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-slate-300">
          <span className="text-white font-bold">{totalCount}</span> submissions
          in the past year
        </p>
        <p className="text-xs text-slate-500">
          Total active days:{" "}
          <span className="text-slate-300 font-semibold">{totalActive}</span>
        </p>
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg
          width={svgW}
          height={svgH}
          style={{ display: "block", fontFamily: "Poppins, sans-serif" }}
        >
          {/* Cells */}
          {grid.map((week, col) =>
            week.map((cell, row) => {
              if (cell === null) return null;
              return (
                <rect
                  key={`${col}-${row}`}
                  x={col * STEP}
                  y={row * STEP}
                  width={CELL}
                  height={CELL}
                  rx={3}
                  ry={3}
                  fill={cellColor(cell.count)}
                >
                  <title>
                    {cell.date}: {cell.count} submission
                    {cell.count !== 1 ? "s" : ""}
                  </title>
                </rect>
              );
            }),
          )}

          {/* Month labels below grid (filtered to avoid overlap) */}
          {filteredMonthLabels.map(({ col, label, x }) => (
            <text
              key={`${label}-${col}`}
              x={x + CELL / 2}
              y={ROWS * STEP + 14}
              fontSize="11"
              fill="#475569"
              textAnchor="middle"
            >
              {label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── Status dot ───────────────────────────────────────────────────────────────
function StatusColor(status) {
  const map = {
    accepted: "text-emerald-400",
    wrong: "text-red-400",
    error: "text-amber-400",
  };
  return map[status] ?? "text-slate-400";
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Profile() {
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

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
  const { data: history } = useQuery({
    queryKey: ["history"],
    queryFn: fetchHistory,
    enabled: isAuthenticated,
  });

  // Heatmap submissions — poll every minute to reflect daily changes automatically
  const { data: heatmapData, refetch: refetchHeatmap } = useQuery({
    queryKey: ["heatmap"],
    queryFn: fetchHeatmap,
    enabled: isAuthenticated,
    refetchInterval: 60 * 1000,
  });

  if (!isAuthenticated)
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-4"
        style={{ background: "#0a0a0f" }}
      >
        <p className="text-slate-400">
          You need to be logged in to view your profile.
        </p>
        <Link
          to="/login"
          className="text-violet-400 hover:text-violet-300 text-sm"
        >
          Login →
        </Link>
      </div>
    );

  const easy = stats?.solvedByDifficulty?.easy ?? 0;
  const medium = stats?.solvedByDifficulty?.medium ?? 0;
  const hard = stats?.solvedByDifficulty?.hard ?? 0;
  const totalSolved = stats?.totalSolved ?? 0;
  const totalSubmissions = stats?.totalSubmissions ?? 0;
  const acceptanceRate = stats?.acceptanceRate ?? "0%";
  const langMap = stats?.submissionsByLanguage ?? {};

  const recentSolved = solved?.solved?.slice(0, 5) ?? [];
  const allSubs = heatmapData?.submissions ?? history?.submissions ?? [];

  return (
    <div
      style={{ background: "#0a0a0f", minHeight: "100vh", paddingTop: "64px" }}
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* ══ LEFT SIDEBAR ══ */}
          <div className="space-y-4">
            {/* Profile card */}
            <div
              className="rounded-2xl p-6"
              style={{ background: "#0d0d1a", border: "1px solid #1e1e30" }}
            >
              {/* Avatar */}
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-violet-600/20 mb-3">
                  {user?.username?.[0]?.toUpperCase() ?? "U"}
                </div>
                <h2 className="text-lg font-bold text-white">
                  {user?.username}
                </h2>
                <p className="text-sm text-slate-500">{user?.email}</p>
                {user?.role === "admin" && (
                  <span className="mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    Admin
                  </span>
                )}
              </div>

              <Link
                to="/settings"
                className="block w-full text-center py-2 rounded-xl text-sm font-semibold text-emerald-400 transition-colors"
                style={{
                  border: "1px solid #10b98130",
                  background: "#10b98108",
                }}
              >
                Edit Profile
              </Link>

              <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <Code size={14} />
                <span>{user?.username}</span>
              </div>
            </div>

            {/* Languages */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "#0d0d1a", border: "1px solid #1e1e30" }}
            >
              <h3 className="text-sm font-bold text-white mb-4">Languages</h3>
              {Object.keys(langMap).length === 0 ? (
                <p className="text-xs text-slate-600">No submissions yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(langMap).map(([lang, count]) => (
                    <div
                      key={lang}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-300"
                          style={{
                            background: "#1a1a2e",
                            border: "1px solid #2d2d45",
                          }}
                        >
                          {lang.charAt(0).toUpperCase() + lang.slice(1)}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {count} problems solved
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skills / Tags */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "#0d0d1a", border: "1px solid #1e1e30" }}
            >
              <h3 className="text-sm font-bold text-white mb-4">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {[...new Set(recentSolved.flatMap((s) => s.tags ?? []))]
                  .slice(0, 12)
                  .map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg text-xs text-slate-400"
                      style={{
                        background: "#1a1a2e",
                        border: "1px solid #1e1e30",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                {recentSolved.flatMap((s) => s.tags ?? []).length === 0 && (
                  <p className="text-xs text-slate-600">
                    Solve problems to show skills
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ══ RIGHT CONTENT ══ */}
          <div className="space-y-5">
            {/* ── Stats row ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Donut + difficulty */}
              <div
                className="sm:col-span-1 rounded-2xl p-5 flex flex-col items-center gap-4"
                style={{ background: "#0d0d1a", border: "1px solid #1e1e30" }}
              >
                <DonutChart
                  easy={easy}
                  medium={medium}
                  hard={hard}
                  total={easy + medium + hard || 1}
                  solved={totalSolved}
                />
                <div className="w-full space-y-2">
                  {[
                    {
                      label: "Easy",
                      val: easy,
                      color: "text-emerald-400",
                      bg: "#10b98115",
                    },
                    {
                      label: "Med.",
                      val: medium,
                      color: "text-amber-400",
                      bg: "#f59e0b15",
                    },
                    {
                      label: "Hard",
                      val: hard,
                      color: "text-red-400",
                      bg: "#ef444415",
                    },
                  ].map((d) => (
                    <div
                      key={d.label}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg"
                      style={{ background: d.bg }}
                    >
                      <span className={cn("text-xs font-semibold", d.color)}>
                        {d.label}
                      </span>
                      <span className="text-xs text-white font-bold">
                        {d.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submissions */}
              <div
                className="rounded-2xl p-5 flex flex-col justify-center"
                style={{ background: "#0d0d1a", border: "1px solid #1e1e30" }}
              >
                <p className="text-sm text-slate-500 mb-1">Submissions</p>
                <p className="text-4xl font-black text-violet-400">
                  {totalSubmissions}
                </p>
                <p className="text-xs text-slate-600 mt-2">All time</p>
              </div>

              {/* Acceptance */}
              <div
                className="rounded-2xl p-5 flex flex-col justify-center"
                style={{ background: "#0d0d1a", border: "1px solid #1e1e30" }}
              >
                <p className="text-sm text-slate-500 mb-1">Acceptance</p>
                <p className="text-4xl font-black text-emerald-400">
                  {acceptanceRate}
                </p>
                <p className="text-xs text-slate-600 mt-2">Accepted / Total</p>
              </div>
            </div>

            {/* ── Heatmap ── */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "#0d0d1a", border: "1px solid #1e1e30" }}
            >
              <Heatmap submissions={allSubs} />
            </div>

            {/* ── Recent AC ── */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "#0d0d1a", border: "1px solid #1e1e30" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Recent AC</h3>
                </div>
                <Link
                  to="/progress"
                  className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  View all <ArrowRight size={11} />
                </Link>
              </div>
              <div className="space-y-0">
                {recentSolved.length === 0 ? (
                  <p className="text-sm text-slate-600 py-4 text-center">
                    No accepted submissions yet
                  </p>
                ) : (
                  recentSolved.map((s, i) => (
                    <Link
                      key={s.submissionId}
                      to={`/problems/${s.questionId}`}
                      className="flex items-center justify-between py-3 text-sm transition-colors hover:bg-white/3 px-2 rounded-lg -mx-2"
                      style={{
                        borderBottom:
                          i < recentSolved.length - 1
                            ? "1px solid #1a1a28"
                            : "none",
                      }}
                    >
                      <span className="text-slate-300 font-medium hover:text-white transition-colors">
                        {s.title}
                      </span>
                      <span className="text-xs text-slate-600 ml-4 whitespace-nowrap">
                        {new Date(s.solvedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
