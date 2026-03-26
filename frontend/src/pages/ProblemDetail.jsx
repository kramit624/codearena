import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "../store/slices/authSlice.js";
import Editor from "@monaco-editor/react";
import axiosInstance from "../lib/axios.js";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  List,
  Play,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  MemoryStick,
  ChevronDown,
  Loader2,
  RotateCcw,
  Maximize2,
  AlignLeft,
  Code2,
} from "lucide-react";
import { cn } from "../lib/utils.js";

// ── API calls ────────────────────────────────────────────────────────────────
const fetchQuestion = async (id) => {
  const res = await axiosInstance.get(`/questions/${id}`);
  return res.data.data;
};

const submitCode = async ({ questionId, code, language }) => {
  const res = await axiosInstance.post("/questions/submit", {
    questionId,
    code,
    language,
  });
  return res.data.data; // { jobId, status }
};

const pollSubmission = async (jobId) => {
  const res = await axiosInstance.get(`/questions/submission/${jobId}`);
  return res.data.data;
};

// ── Difficulty badge ─────────────────────────────────────────────────────────
function DiffBadge({ difficulty }) {
  const map = {
    easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    medium: "bg-amber-500/10  text-amber-400  border-amber-500/20",
    hard: "bg-red-500/10    text-red-400    border-red-500/20",
  };
  return (
    <span
      className={cn(
        "px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize",
        map[difficulty] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20",
      )}
    >
      {difficulty}
    </span>
  );
}

// ── Left panel tabs ──────────────────────────────────────────────────────────
const LEFT_TABS = ["Description", "Submissions"];

// ── Language options ─────────────────────────────────────────────────────────
const LANGUAGES = [
  { label: "JavaScript", value: "javascript", monaco: "javascript" },
  { label: "Python", value: "python", monaco: "python" },
];

const getStorageKey = (questionId, language) =>
  `code_${questionId}_${language}`;

// ── Test result row ──────────────────────────────────────────────────────────
function TestResultRow({ result, index }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: `1px solid ${result.passed ? "#10b98130" : "#ef444430"}`,
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors"
        style={{ background: result.passed ? "#10b98108" : "#ef444408" }}
      >
        {result.passed ? (
          <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
        ) : (
          <XCircle size={15} className="text-red-400    flex-shrink-0" />
        )}
        <span className={result.passed ? "text-emerald-400" : "text-red-400"}>
          Case {index + 1}
        </span>
        {result.isHidden && (
          <span className="ml-2 text-xs text-slate-600">(hidden)</span>
        )}
        <span className="ml-auto text-xs text-slate-600">
          {result.executionTime ? `${result.executionTime}ms` : ""}
        </span>
        <ChevronDown
          size={13}
          className={cn(
            "text-slate-600 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && !result.isHidden && (
        <div className="px-4 pb-3 space-y-2" style={{ background: "#0a0a0f" }}>
          {result.input !== undefined && (
            <div>
              <p className="text-xs text-slate-600 mb-1">Input</p>
              <pre className="text-xs text-slate-300 font-mono bg-white/3 rounded-lg px-3 py-2 overflow-x-auto">
                {JSON.stringify(result.input)}
              </pre>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-600 mb-1">Expected</p>
            <pre className="text-xs text-emerald-400 font-mono bg-emerald-500/5 rounded-lg px-3 py-2 overflow-x-auto">
              {JSON.stringify(result.expected)}
            </pre>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Your output</p>
            <pre
              className={cn(
                "text-xs font-mono rounded-lg px-3 py-2 overflow-x-auto",
                result.passed
                  ? "text-emerald-400 bg-emerald-500/5"
                  : "text-red-400 bg-red-500/5",
              )}
            >
              {JSON.stringify(result.actual)}
            </pre>
          </div>
          {result.error && (
            <div>
              <p className="text-xs text-slate-600 mb-1">Error</p>
              <pre className="text-xs text-red-400 font-mono bg-red-500/5 rounded-lg px-3 py-2 overflow-x-auto whitespace-pre-wrap">
                {result.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Submission history row ───────────────────────────────────────────────────
function SubmissionRow({ sub }) {
  const statusColor = {
    accepted: "text-emerald-400",
    wrong: "text-red-400",
    error: "text-amber-400",
    pending: "text-slate-400",
    running: "text-blue-400",
  };
  return (
    <div
      className="grid items-center px-4 py-3 text-sm rounded-xl mb-2 transition-colors hover:bg-white/3"
      style={{
        gridTemplateColumns: "1fr 6rem 7rem 6rem",
        background: "#0f0f1e",
        border: "1px solid #1a1a28",
      }}
    >
      <span
        className={cn(
          "font-semibold capitalize",
          statusColor[sub.status] ?? "text-slate-400",
        )}
      >
        {sub.status}
      </span>
      <span className="text-slate-500 text-xs capitalize">{sub.language}</span>
      <span className="text-slate-500 text-xs text-right">
        {sub.passedCount}/{sub.totalCount} tests
      </span>
      <span className="text-slate-600 text-xs text-right">
        {sub.executionTime ? `${sub.executionTime}ms` : "—"}
      </span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ProblemDetail() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [leftTab, setLeftTab] = useState("Description");
  const [language, setLanguage] = useState("javascript");
  const [langOpen, setLangOpen] = useState(false);
  const [code, setCode] = useState("");
  const [starterCache, setStarterCache] = useState({});
  const [bottomTab, setBottomTab] = useState("testcase"); // "testcase" | "result"
  const [activeTestIndex, setActiveTestIndex] = useState(0);

  // Submission polling state
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const pollRef = useRef(null);

  // Refs to keep latest values (avoid stale closures in submit/poll)
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  const codeRef = useRef(code);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  const langRef = useRef(null);

  // Close lang dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target))
        setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch question
  const {
    data: question,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["question", questionId],
    queryFn: () => fetchQuestion(questionId),
    retry: false,
  });

  // Fetch submission history
  const { data: submissionsData, refetch: refetchSubmissions } = useQuery({
    queryKey: ["my-submissions-problem", questionId],
    queryFn: async () => {
      const res = await axiosInstance.get("/users/submissions");
      const all = res.data.data.submissions;
      return all.filter((s) => s.question?.questionId === questionId);
    },
    enabled: isAuthenticated && leftTab === "Submissions",
  });

  // Set starter code when question loads or language changes
  // populate starter cache when question loads and set initial code to current language starter
useEffect(() => {
  if (!question) return;

  const newCache = {};

  LANGUAGES.forEach((lang) => {
    const key = getStorageKey(question._id, lang.value);
    const saved = localStorage.getItem(key);

    newCache[lang.value] = saved || question.starterCode?.[lang.value] || "";
  });

  setStarterCache(newCache);

  setLanguage("javascript");
  setCode(newCache["javascript"]);
}, [question]);

// Save to localStorage only when question is loaded and code is present
useEffect(() => {
  if (!question?._id || code === undefined || code === null) return;

  const key = getStorageKey(question._id, language);
  localStorage.setItem(key, code);
}, [code, language, question?._id]);

  // Handler to change language while preserving current code in cache
const handleLanguageChange = (newLang) => {
  // save current code
  const currentKey = getStorageKey(question._id, language);
  localStorage.setItem(currentKey, code);

  // load new language code
  const newKey = getStorageKey(question._id, newLang);
  const saved = localStorage.getItem(newKey);

  const newCode = saved || question?.starterCode?.[newLang] || "";

  setLanguage(newLang);
  setCode(newCode);
  setLangOpen(false);
};

  // Poll submission result
  const startPolling = (jId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const result = await pollSubmission(jId);
        if (!["pending", "running"].includes(result.status)) {
          clearInterval(pollRef.current);
          setSubmitResult(result);
          setSubmitting(false);
          setBottomTab("result");
          refetchSubmissions();
          if (result.status === "accepted") {
            toast.success(
              `✅ Accepted! ${result.passedCount}/${result.totalCount} passed`,
            );
          } else {
            toast.error(
              `❌ ${result.passedCount}/${result.totalCount} test cases passed`,
            );
          }
        }
      } catch (e) {
        clearInterval(pollRef.current);
        setSubmitting(false);
        toast.error("Failed to get result");
      }
    }, 1500);
  };

  useEffect(() => () => clearInterval(pollRef.current), []);

  // reset active test index whenever a new question is opened
  useEffect(() => {
    setActiveTestIndex(0);
  }, [questionId]);

  // Submit handler
  const handleSubmit = async () => {
    if (!isAuthenticated) {
      toast.error("Login to submit");
      return;
    }

    const currentCode = codeRef.current;
    const currentLanguage = languageRef.current;

    if (!currentCode || !currentCode.trim()) {
      toast.error("Write some code first");
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);
    setBottomTab("result");

    try {
      const data = await submitCode({
        questionId,
        code: currentCode,
        language: currentLanguage,
      });
      setJobId(data.jobId);
      startPolling(data.jobId);
    } catch (err) {
      setSubmitting(false);
      toast.error(err.response?.data?.message ?? "Submit failed");
    }
  };

  // Reset code to starter
const handleReset = () => {
  const starter = question?.starterCode?.[language] || "";

  setStarterCache((prev) => ({
    ...prev,
    [language]: starter,
  }));

  setCode(starter);
  toast.success("Code reset");
};

  // Monaco options
  const editorOptions = {
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    lineNumbers: "on",
    renderLineHighlight: "line",
    padding: { top: 12 },
    smoothScrolling: true,
    cursorBlinking: "smooth",
    tabSize: 2,
  };

  if (isLoading)
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "#0a0a0f" }}
      >
        <Loader2 size={32} className="text-violet-400 animate-spin" />
      </div>
    );

  if (error || !question)
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-4"
        style={{ background: "#0a0a0f" }}
      >
        <p className="text-slate-400">Question not found</p>
        <Link
          to="/problems"
          className="text-violet-400 text-sm hover:text-violet-300"
        >
          ← Back to Problems
        </Link>
      </div>
    );

  const visibleTestCases = question.testCases ?? [];
  const currentLang = LANGUAGES.find((l) => l.value === language);

  return (
    <div
      className="flex flex-col"
      style={{ background: "#0a0a0f", height: "100vh", paddingTop: "64px" }}
    >
      {/* ── Top bar ── */}
      <div
        className="flex items-center justify-between px-4 h-11 flex-shrink-0"
        style={{ background: "#0d0d1a", borderBottom: "1px solid #1e1e30" }}
      >
        {/* Left — nav */}
        <div className="flex items-center gap-1">
          <Link
            to="/problems"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <List size={14} />
            <span className="hidden sm:inline">Problem List</span>
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Center — Submit button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-1.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60"
            style={{
              background: submitting ? "#5b21b6" : "#7c3aed",
              boxShadow: "0 0 20px #7c3aed30",
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Running...
              </>
            ) : (
              <>
                <Upload size={14} /> Submit
              </>
            )}
          </button>
        </div>

        {/* Right — empty for now */}
        <div className="w-32" />
      </div>

      {/* ── Main split layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ══ LEFT PANEL ══ */}
        <div
          className="flex flex-col w-[46%] min-w-[340px] overflow-hidden flex-shrink-0"
          style={{ borderRight: "1px solid #1e1e30" }}
        >
          {/* Tabs */}
          <div
            className="flex items-center gap-1 px-4 pt-2 flex-shrink-0"
            style={{ borderBottom: "1px solid #1e1e30" }}
          >
            {LEFT_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                  leftTab === tab
                    ? "border-violet-500 text-white"
                    : "border-transparent text-slate-500 hover:text-slate-300",
                )}
              >
                {tab === "Description" ? (
                  <AlignLeft size={13} />
                ) : (
                  <List size={13} />
                )}
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {leftTab === "Description" && (
              <div>
                {/* Title + difficulty */}
                <div className="flex items-start gap-3 mb-4 flex-wrap">
                  <h1 className="text-xl font-bold text-white flex-1">
                    {question.title}
                  </h1>
                </div>
                <div className="flex items-center gap-2 mb-5 flex-wrap">
                  <DiffBadge difficulty={question.difficulty} />
                  {question.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-400"
                      style={{
                        background: "#1a1a2e",
                        border: "1px solid #2d2d45",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Description */}
                <div
                  className="text-sm text-slate-300 leading-relaxed mb-6 prose-invert"
                  style={{ lineHeight: "1.75" }}
                  dangerouslySetInnerHTML={{
                    __html: question.description.replace(/\n/g, "<br/>"),
                  }}
                />

                {/* Visible test cases as examples */}
                {visibleTestCases.map((tc, i) => (
                  <div key={i} className="mb-5">
                    <p className="text-sm font-bold text-white mb-2">
                      Example {i + 1}:
                    </p>
                    <div
                      className="rounded-xl p-4 font-mono text-sm space-y-1"
                      style={{
                        background: "#0f0f1e",
                        border: "1px solid #1e1e30",
                      }}
                    >
                      <div>
                        <span className="text-slate-500 font-sans font-semibold text-xs">
                          Input:{" "}
                        </span>
                        <span className="text-slate-200">
                          {tc.input.map((arg, j) => (
                            <span key={j}>
                              {question.functionName
                                ? `arg${j + 1}`
                                : `arg${j + 1}`}{" "}
                              = {JSON.stringify(arg)}
                              {j < tc.input.length - 1 ? ", " : ""}
                            </span>
                          ))}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans font-semibold text-xs">
                          Output:{" "}
                        </span>
                        <span className="text-slate-200">
                          {JSON.stringify(tc.expected)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {leftTab === "Submissions" && (
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold mb-4">
                  My Submissions
                </p>
                {!isAuthenticated ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500 text-sm mb-3">
                      Login to see your submissions
                    </p>
                    <Link
                      to="/login"
                      className="text-violet-400 text-sm hover:text-violet-300"
                    >
                      Login →
                    </Link>
                  </div>
                ) : !submissionsData?.length ? (
                  <div className="text-center py-12">
                    <p className="text-slate-600 text-sm">No submissions yet</p>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div
                      className="grid text-xs text-slate-600 uppercase tracking-wider px-4 py-2 mb-2"
                      style={{ gridTemplateColumns: "1fr 6rem 7rem 6rem" }}
                    >
                      <span>Status</span>
                      <span>Language</span>
                      <span className="text-right">Tests</span>
                      <span className="text-right">Time</span>
                    </div>
                    {submissionsData.map((sub) => (
                      <SubmissionRow key={sub.submissionId} sub={sub} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══ RIGHT PANEL ══ */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* ── Code Editor ── */}
          <div
            className="flex flex-col flex-1 overflow-hidden"
            style={{ minHeight: "55%" }}
          >
            {/* Editor header */}
            <div
              className="flex items-center justify-between px-4 h-10 flex-shrink-0"
              style={{
                background: "#0d0d1a",
                borderBottom: "1px solid #1e1e30",
              }}
            >
              <div className="flex items-center gap-2">
                <Code2 size={14} className="text-violet-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Code
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Language selector */}
                <div className="relative" ref={langRef}>
                  <button
                    onClick={() => setLangOpen((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-slate-300 hover:text-white transition-colors"
                    style={{
                      background: "#13131f",
                      border: "1px solid #2d2d45",
                    }}
                  >
                    {currentLang?.label ?? language}
                    <ChevronDown
                      size={11}
                      className={cn(
                        "text-slate-500 transition-transform",
                        langOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {langOpen && (
                    <div
                      className="absolute right-0 top-full mt-1 w-36 rounded-xl overflow-hidden z-50 shadow-xl"
                      style={{
                        background: "#13131f",
                        border: "1px solid #2d2d45",
                      }}
                    >
                      {LANGUAGES.map((l) => (
                        <button
                          key={l.value}
                          onClick={() => handleLanguageChange(l.value)}
                          className={cn(
                            "w-full text-left px-4 py-2.5 text-xs transition-colors",
                            language === l.value
                              ? "text-violet-400 bg-violet-500/10"
                              : "text-slate-400 hover:text-white hover:bg-white/5",
                          )}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reset */}
                <button
                  onClick={handleReset}
                  title="Reset to starter code"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                  style={{ border: "1px solid #1e1e30" }}
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            {/* Monaco */}
            <div className="flex-1 overflow-hidden">
              <Editor
                key={language}
                height="100%"
                language={currentLang?.monaco ?? "javascript"}
                value={code}
                onChange={(val) => setCode(val ?? "")}
                theme="vs-dark"
                options={editorOptions}
              />
            </div>
          </div>

          {/* ── Bottom panel: Testcase / Result ── */}
          <div
            className="flex flex-col flex-shrink-0"
            style={{
              height: "45%",
              borderTop: "1px solid #1e1e30",
              background: "#0d0d1a",
            }}
          >
            {/* Bottom tabs */}
            <div
              className="flex items-center gap-1 px-4 pt-1 flex-shrink-0"
              style={{ borderBottom: "1px solid #1e1e30" }}
            >
              {["testcase", "result"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setBottomTab(tab)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px capitalize",
                    bottomTab === tab
                      ? "border-violet-500 text-white"
                      : "border-transparent text-slate-500 hover:text-slate-300",
                  )}
                >
                  {tab === "testcase" ? (
                    <Play size={11} />
                  ) : (
                    <CheckCircle2 size={11} />
                  )}
                  {tab === "testcase" ? "Testcase" : "Test Result"}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* ── Testcase tab ── */}
              {bottomTab === "testcase" && (
                <div>
                  {visibleTestCases.length === 0 ? (
                    <p className="text-slate-600 text-sm text-center py-8">
                      No visible test cases
                    </p>
                  ) : (
                    <>
                      {/* Case tabs */}
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        {visibleTestCases.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveTestIndex(i)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                              activeTestIndex === i
                                ? "bg-[#1e1e30] text-white border border-purple-500"
                                : "text-slate-400 border border-[#1e1e30] hover:text-white"
                            }`}
                          >
                            Case {i + 1}
                          </button>
                        ))}
                      </div>

                      {/* Show active test case inputs */}
                      {visibleTestCases[activeTestIndex]?.input?.map((arg, i) => (
                        <div key={i} className="mb-3">
                          <p className="text-xs text-slate-500 mb-1 font-mono">
                            {`arg${i + 1}`} =
                          </p>
                          <div
                            className="px-3 py-2.5 rounded-lg font-mono text-sm text-slate-200"
                            style={{
                              background: "#13131f",
                              border: "1px solid #1e1e30",
                            }}
                          >
                            {JSON.stringify(arg)}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* ── Result tab ── */}
              {bottomTab === "result" && (
                <div>
                  {submitting && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2
                        size={28}
                        className="text-violet-400 animate-spin"
                      />
                      <p className="text-sm text-slate-500">
                        Running your code...
                      </p>
                    </div>
                  )}

                  {!submitting && !submitResult && (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <Play size={28} className="text-slate-700" />
                      <p className="text-sm text-slate-600">
                        Submit your code to see results
                      </p>
                    </div>
                  )}

                  {!submitting && submitResult && (
                    <div>
                      {/* Summary bar */}
                      <div
                        className="flex items-center gap-4 px-4 py-3 rounded-xl mb-4 flex-wrap"
                        style={{
                          background:
                            submitResult.status === "accepted"
                              ? "#10b98112"
                              : "#ef444412",
                          border: `1px solid ${submitResult.status === "accepted" ? "#10b98130" : "#ef444430"}`,
                        }}
                      >
                        {submitResult.status === "accepted" ? (
                          <CheckCircle2
                            size={20}
                            className="text-emerald-400 flex-shrink-0"
                          />
                        ) : (
                          <XCircle
                            size={20}
                            className="text-red-400 flex-shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <p
                            className={cn(
                              "text-base font-bold capitalize",
                              submitResult.status === "accepted"
                                ? "text-emerald-400"
                                : "text-red-400",
                            )}
                          >
                            {submitResult.status === "accepted"
                              ? "Accepted"
                              : submitResult.status.replace("_", " ")}
                          </p>
                          <p className="text-xs text-slate-500">
                            {submitResult.passedCount}/{submitResult.totalCount}{" "}
                            test cases passed
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          {submitResult.executionTime && (
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              {submitResult.executionTime}ms
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Individual test results */}
                      <div className="space-y-2">
                        {submitResult.results?.map((r, i) => (
                          <TestResultRow key={i} result={r} index={i} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
