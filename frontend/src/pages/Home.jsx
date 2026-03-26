import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  Zap,
  Shield,
  Globe,
  CheckCircle2,
  Code2,
  Terminal,
  Cpu,
  GitBranch,
  Lock,
  BarChart3,
} from "lucide-react";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Footer from "../components/Footer";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "../store/slices/authSlice.js";

gsap.registerPlugin(ScrollTrigger);

// ─── Typewriter Lines ───────────────────────────────────────────────────────
const typewriterLines = [
  { text: "const result = await runInDocker({", color: "#a78bfa" },
  { text: "  code, language: 'javascript',", color: "#94a3b8" },
  { text: "  memory: '100m', timeout: 5000", color: "#94a3b8" },
  { text: "});", color: "#a78bfa" },
  { text: "", color: "" },
  { text: "// ✅ Test case evaluation", color: "#10b981" },
  { text: "for (const test of testCases) {", color: "#a78bfa" },
  { text: "  const passed = output === test.expected;", color: "#94a3b8" },
  { text: "}", color: "#a78bfa" },
];

// ─── Typewriter Component ────────────────────────────────────────────────────
function CodeTypewriter() {
  const [lines, setLines] = useState([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    // Cursor blink
    const cursorInterval = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    const line = typewriterLines[currentLine];
    if (!line) return;

    // If empty line, just advance
    if (line.text === "") {
      const t = setTimeout(() => {
        setLines((prev) => [...prev, { text: "", color: "" }]);
        setCurrentLine((v) => v + 1);
        setCurrentChar(0);
      }, 300);
      return () => clearTimeout(t);
    }

    if (!isDeleting) {
      if (currentChar < line.text.length) {
        const t = setTimeout(() => {
          setCurrentChar((v) => v + 1);
        }, 45);
        return () => clearTimeout(t);
      } else {
        // Line complete — wait then move on
        const isLast = currentLine === typewriterLines.length - 1;
        const t = setTimeout(
          () => {
            setLines((prev) => [
              ...prev,
              { text: line.text, color: line.color },
            ]);
            if (isLast) {
              // Wait then restart
              setTimeout(() => {
                setLines([]);
                setCurrentLine(0);
                setCurrentChar(0);
              }, 2800);
            } else {
              setCurrentLine((v) => v + 1);
              setCurrentChar(0);
            }
          },
          isLast ? 0 : 180,
        );
        return () => clearTimeout(t);
      }
    }
  }, [currentLine, currentChar, isDeleting]);

  const currentLineData = typewriterLines[currentLine];
  const activeText = currentLineData?.text.slice(0, currentChar) || "";

  return (
    <div className="font-mono text-sm leading-6 select-none">
      {lines.map((l, i) => (
        <div
          key={i}
          className={l.text === "" ? "h-4" : ""}
          style={{ color: l.color || "#94a3b8" }}
        >
          {l.text}
        </div>
      ))}
      {currentLineData && (
        <div style={{ color: currentLineData.color || "#94a3b8" }}>
          {activeText}
          <span
            className="inline-block w-[2px] h-[1.1em] bg-violet-400 ml-0.5 align-middle"
            style={{ opacity: showCursor ? 1 : 0, transition: "opacity 0.1s" }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Particle Canvas ─────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.5 ? "124,58,237" : "6,182,212",
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      particles.forEach((p, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(124,58,237,${0.15 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        });
      });

      // Draw particles
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
        ctx.fill();

        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      });

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

// ─── DNA Helix Canvas ─────────────────────────────────────────────────────────
function HelixCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const amplitude = 80;
      const freq = 0.04;
      const points = 120;

      for (let i = 0; i < points; i++) {
        const progress = i / points;
        const y = progress * canvas.height;
        const x1 = cx + Math.sin(i * freq + t) * amplitude;
        const x2 = cx - Math.sin(i * freq + t) * amplitude;

        // Strand 1
        const alpha1 = 0.3 + 0.7 * Math.abs(Math.sin(i * freq + t));
        ctx.beginPath();
        ctx.arc(x1, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124,58,237,${alpha1 * 0.8})`;
        ctx.fill();

        // Strand 2
        const alpha2 = 0.3 + 0.7 * Math.abs(Math.cos(i * freq + t));
        ctx.beginPath();
        ctx.arc(x2, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6,182,212,${alpha2 * 0.8})`;
        ctx.fill();

        // Connector (every 8 steps)
        if (i % 8 === 0) {
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.strokeStyle = `rgba(167,139,250,${0.15})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      t += 0.02;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

// ─── Orbiting Canvas ──────────────────────────────────────────────────────────
function OrbitCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const rings = [
      {
        radius: 70,
        speed: 0.008,
        color: "124,58,237",
        dotColor: "167,139,250",
        size: 6,
      },
      {
        radius: 110,
        speed: -0.005,
        color: "6,182,212",
        dotColor: "103,232,249",
        size: 5,
      },
      {
        radius: 150,
        speed: 0.003,
        color: "16,185,129",
        dotColor: "52,211,153",
        size: 4,
      },
    ];

    let angles = [0, Math.PI / 3, Math.PI * 0.7];

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Center glow
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
      grad.addColorStop(0, "rgba(124,58,237,0.3)");
      grad.addColorStop(1, "rgba(124,58,237,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(167,139,250,0.9)";
      ctx.fill();

      // Rings
      rings.forEach((ring, i) => {
        // Draw orbit ring
        ctx.beginPath();
        ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ring.color},0.12)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw orbiting dot
        angles[i] += ring.speed;
        const dx = cx + Math.cos(angles[i]) * ring.radius;
        const dy = cy + Math.sin(angles[i]) * ring.radius;

        // Glow behind dot
        const dotGrad = ctx.createRadialGradient(
          dx,
          dy,
          0,
          dx,
          dy,
          ring.size * 3,
        );
        dotGrad.addColorStop(0, `rgba(${ring.dotColor},0.5)`);
        dotGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(dx, dy, ring.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = dotGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(dx, dy, ring.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ring.dotColor},0.95)`;
        ctx.fill();
      });

      t += 0.01;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

// ─── Stat Counter ─────────────────────────────────────────────────────────────
function StatCard({ value, label, suffix = "" }) {
  const ref = useRef(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: ref.current,
      start: "top 80%",
      once: true,
      onEnter: () => {
        gsap.to(
          { val: 0 },
          {
            val: value,
            duration: 1.8,
            ease: "power2.out",
            onUpdate() {
              setCount(Math.floor(this.targets()[0].val));
            },
          },
        );
      },
    });
    return () => trigger.kill();
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl font-black gradient-text tabular-nums">
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="text-sm text-slate-500 mt-1 font-medium">{label}</div>
    </div>
  );
}

// ─── Main Home Component ──────────────────────────────────────────────────────
export default function Home() {
  const heroRef = useRef(null);
  const heroTitleRef = useRef(null);
  const heroSubRef = useRef(null);
  const heroBadgeRef = useRef(null);
  const heroCtaRef = useRef(null);
  const heroEditorRef = useRef(null);
  const section2Ref = useRef(null);
  const section3Ref = useRef(null);
  const section4Ref = useRef(null);
  const statsRef = useRef(null);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    // Hero entrance
    const tl = gsap.timeline({ delay: 0.5 });

    tl.fromTo(
      heroBadgeRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: "back.out(2)" },
    )
      .fromTo(
        heroTitleRef.current.querySelectorAll(".word"),
        { opacity: 0, y: 60, rotationX: -30 },
        {
          opacity: 1,
          y: 0,
          rotationX: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
        },
      )
      .fromTo(
        heroSubRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
        "-=0.3",
      )
      .fromTo(
        heroCtaRef.current.querySelectorAll("a, button"),
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" },
        "-=0.3",
      )
      .fromTo(
        heroEditorRef.current,
        { opacity: 0, x: 60, scale: 0.95 },
        { opacity: 1, x: 0, scale: 1, duration: 0.9, ease: "power3.out" },
        "-=0.7",
      );

    // Section 2
    gsap.fromTo(
      section2Ref.current.querySelectorAll(".card-item"),
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: { trigger: section2Ref.current, start: "top 70%" },
      },
    );

    // Section 3
    gsap.fromTo(
      section3Ref.current.querySelector(".section-text"),
      { opacity: 0, x: -50 },
      {
        opacity: 1,
        x: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: { trigger: section3Ref.current, start: "top 70%" },
      },
    );
    gsap.fromTo(
      section3Ref.current.querySelector(".section-visual"),
      { opacity: 0, x: 50 },
      {
        opacity: 1,
        x: 0,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: { trigger: section3Ref.current, start: "top 70%" },
      },
    );

    // Section 4
    gsap.fromTo(
      section4Ref.current.querySelectorAll(".tech-item"),
      { opacity: 0, scale: 0.8 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.4,
        stagger: 0.06,
        ease: "back.out(1.7)",
        scrollTrigger: { trigger: section4Ref.current, start: "top 75%" },
      },
    );

    // Stats
    gsap.fromTo(
      statsRef.current.querySelectorAll(".stat-item"),
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        scrollTrigger: { trigger: statsRef.current, start: "top 80%" },
      },
    );

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  const titleWords = ["Master", "DSA.", "Get", "Hired."];
  const features = [
    {
      icon: Terminal,
      title: "Docker Sandbox",
      desc: "Code runs in isolated Docker containers — safe, fast, and resource-controlled execution for every submission.",
      color: "violet",
    },
    {
      icon: Zap,
      title: "BullMQ Queue System",
      desc: "Job queue architecture with Redis backing. Handle thousands of concurrent submissions without breaking a sweat.",
      color: "cyan",
    },
    {
      icon: Globe,
      title: "Multi-Language",
      desc: "JavaScript and Python support today. The architecture is built to scale — add any language with zero refactoring.",
      color: "green",
    },
    {
      icon: BarChart3,
      title: "Real Analytics",
      desc: "Track acceptance rate, difficulty breakdown, language stats. Data-driven practice makes you grow faster.",
      color: "pink",
    },
    {
      icon: Shield,
      title: "Secure by Design",
      desc: "JWT refresh rotation, hashed tokens, httpOnly cookies. Auth done right — not as an afterthought.",
      color: "violet",
    },
    {
      icon: GitBranch,
      title: "Open Architecture",
      desc: "Built in public, designed to be hackable. MERN stack with clean separation of concerns.",
      color: "cyan",
    },
  ];

  const techStack = [
    { name: "Node.js", color: "#68A063" },
    { name: "MongoDB", color: "#47A248" },
    { name: "Redis", color: "#FF4438" },
    { name: "Docker", color: "#2496ED" },
    { name: "BullMQ", color: "#F05032" },
    { name: "React", color: "#61DAFB" },
    { name: "Tailwind", color: "#06B6D4" },
    { name: "GSAP", color: "#88CE02" },
  ];

  const colorMap = {
    violet: {
      bg: "bg-violet-500/10",
      text: "text-violet-400",
      border: "border-violet-500/20",
      glow: "group-hover:shadow-violet-500/10",
    },
    cyan: {
      bg: "bg-cyan-500/10",
      text: "text-cyan-400",
      border: "border-cyan-500/20",
      glow: "group-hover:shadow-cyan-500/10",
    },
    green: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
      glow: "group-hover:shadow-emerald-500/10",
    },
    pink: {
      bg: "bg-pink-500/10",
      text: "text-pink-400",
      border: "border-pink-500/20",
      glow: "group-hover:shadow-pink-500/10",
    },
  };

  return (
    <div className="noise min-h-screen">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center pt-16 overflow-hidden grid-bg"
      >
        {/* Background glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-600/8 rounded-full blur-[100px] pointer-events-none" />

        {/* Particle canvas */}
        <div className="absolute inset-0 pointer-events-none">
          <ParticleCanvas />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div>
              <div
                ref={heroBadgeRef}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold mb-6"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                BUILD IN PUBLIC
              </div>

              <h1
                ref={heroTitleRef}
                className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] mb-6"
                style={{ perspective: "600px" }}
              >
                {titleWords.map((word, i) => (
                  <span
                    key={i}
                    className={`word inline-block mr-4 ${i === 1 || i === 3 ? "gradient-text" : "text-white"}`}
                  >
                    {word}
                  </span>
                ))}
              </h1>

              <p
                ref={heroSubRef}
                className="text-lg text-slate-400 leading-relaxed mb-8 max-w-lg"
              >
                A full-stack LeetCode clone built from scratch — Docker sandbox
                execution, BullMQ job queues, real-time results. Didn't know any
                of it. Learned it. Built it. It works.
              </p>

              <div ref={heroCtaRef} className="flex flex-wrap gap-4">
                <Link
                  to="/problems"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-600/25 hover:shadow-violet-500/35 transition-all duration-200 group"
                >
                  Start Solving
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </Link>
                {isAuthenticated ? (
                  <Link
                    to="/profile"
                    className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border-bright)] hover:border-violet-500/40 text-slate-300 hover:text-white font-medium rounded-xl hover:bg-white/3 transition-all duration-200"
                  >
                    Go to Profile
                  </Link>
                ) : (
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--border-bright)] hover:border-violet-500/40 text-slate-300 hover:text-white font-medium rounded-xl hover:bg-white/3 transition-all duration-200"
                  >
                    Create Account
                  </Link>
                )}
              </div>

              {/* Tech badges */}
              <div className="flex flex-wrap gap-2 mt-8">
                {["Docker", "BullMQ", "Redis", "Node.js", "MongoDB"].map(
                  (t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 rounded-lg bg-white/4 border border-white/8 text-xs text-slate-400 font-medium"
                    >
                      {t}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Right — Code Editor */}
            <div ref={heroEditorRef} className="float">
              <div className="rounded-2xl border border-[var(--border-bright)] overflow-hidden shadow-2xl shadow-black/60 animated-border">
                {/* Editor titlebar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-[#1a1a2e] border-b border-[var(--border)]">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="ml-3 text-xs text-slate-500 font-mono">
                    submissionWorker.js
                  </span>
                  <span className="ml-auto px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/20">
                    #BUILDINPUBLIC
                  </span>
                </div>

                {/* Line numbers + code */}
                <div className="bg-[#0f0f1e] p-4">
                  <div className="flex gap-4">
                    {/* Line numbers */}
                    <div className="flex flex-col text-right text-xs text-slate-700 font-mono leading-6 select-none min-w-[1.2rem]">
                      {Array.from({ length: 12 }, (_, i) => (
                        <span key={i}>{i + 1}</span>
                      ))}
                    </div>
                    {/* Typewriter code */}
                    <div className="flex-1 min-h-[14rem]">
                      <CodeTypewriter />
                    </div>
                  </div>
                </div>

                {/* Status bar */}
                <div className="bg-[#13131f] border-t border-[var(--border)] px-4 py-3 grid grid-cols-2 gap-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Status</span>
                    <span className="text-xs font-semibold text-emerald-400">
                      ✓ ACCEPTED
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Test Cases</span>
                    <span className="text-xs text-slate-300">4 / 4 passed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Runtime</span>
                    <span className="text-xs text-slate-300">48ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Memory</span>
                    <span className="text-xs text-slate-300">38.2 MB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-600">
          <span className="text-xs font-medium tracking-widest uppercase">
            Scroll
          </span>
          <div className="w-px h-8 bg-gradient-to-b from-slate-600 to-transparent animate-pulse" />
        </div>
      </section>

      {/* ── SECTION 2: Features ────────────────────────────────────────────── */}
      <section ref={section2Ref} className="py-28 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 card-item">
            <Badge variant="purple" className="mb-4">
              Features
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
              Everything you need to{" "}
              <span className="gradient-text">level up</span>
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Not just a code editor. A complete platform built on
              production-grade architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => {
              const c = colorMap[feature.color];
              return (
                <div
                  key={i}
                  className={`card-item group p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-opacity-60 hover:shadow-lg ${c.glow} transition-all duration-300 cursor-default`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center mb-4`}
                  >
                    <feature.icon size={18} className={c.text} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: Architecture + Helix Canvas ─────────────────────── */}
      <section ref={section3Ref} className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Text */}
            <div className="section-text">
              <Badge variant="cyan" className="mb-4">
                Architecture
              </Badge>
              <h2 className="text-4xl font-black text-white mb-6 leading-tight">
                Production architecture.{" "}
                <span className="gradient-text">Zero compromise.</span>
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Every submission goes through a BullMQ job queue backed by
                Redis. Docker containers spin up on demand — isolated,
                memory-capped, and timeout-safe. Your code never touches the
                server directly.
              </p>

              <div className="space-y-4">
                {[
                  {
                    step: "01",
                    label: "Submit Code",
                    desc: "Hits the API — job created in MongoDB as 'pending'",
                  },
                  {
                    step: "02",
                    label: "Queue Job",
                    desc: "BullMQ adds the job to Redis — returns jobId instantly",
                  },
                  {
                    step: "03",
                    label: "Docker Execute",
                    desc: "Worker spins up a container, runs your code safely",
                  },
                  {
                    step: "04",
                    label: "Poll Results",
                    desc: "Frontend polls /submission/:jobId until status resolves",
                  },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-4">
                    <span className="text-xs font-black text-violet-500 font-mono bg-violet-500/10 border border-violet-500/20 rounded-lg px-2 py-1 mt-0.5 shrink-0">
                      {s.step}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {s.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {s.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual — Helix Canvas */}
            <div className="section-visual">
              <div className="relative rounded-2xl border border-[var(--border-bright)] bg-[var(--bg-card)] overflow-hidden h-80 lg:h-[420px]">
                <HelixCanvas />
                <div className="absolute bottom-4 left-4 right-4 glass rounded-xl p-3 border border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-slate-400 font-mono">
                      Queue active — 3 jobs processing
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section ref={statsRef} className="py-20 border-y border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 150, label: "Problems", suffix: "+" },
              { value: 12, label: "Languages Coming", suffix: "" },
              { value: 5000, label: "Submissions", suffix: "+" },
              { value: 100, label: "Uptime", suffix: "%" },
            ].map((s, i) => (
              <div key={i} className="stat-item">
                <StatCard value={s.value} label={s.label} suffix={s.suffix} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Tech Stack + Orbit Canvas ──────────────────────── */}
      <section ref={section4Ref} className="py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Orbit Canvas */}
            <div className="order-2 lg:order-1">
              <div className="rounded-2xl border border-[var(--border-bright)] bg-[var(--bg-card)] overflow-hidden h-72 lg:h-96 relative">
                <OrbitCanvas />
                <div className="absolute inset-0 flex items-end p-4 pointer-events-none">
                  <div className="glass rounded-xl px-4 py-2 border border-[var(--border)]">
                    <span className="text-xs text-slate-400 font-mono">
                      System cores: Docker · Redis · BullMQ · MongoDB
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tech stack grid */}
            <div className="order-1 lg:order-2">
              <Badge variant="green" className="mb-4">
                Tech Stack
              </Badge>
              <h2 className="text-4xl font-black text-white mb-6 leading-tight">
                Chosen for <span className="gradient-text-warm">scale,</span>{" "}
                not for hype.
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Every piece of the stack was picked deliberately. Redis for
                speed. Docker for isolation. BullMQ for reliability. MongoDB for
                flexibility.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {techStack.map((tech, i) => (
                  <div
                    key={i}
                    className="tech-item flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-bright)] transition-colors group cursor-default"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: tech.color,
                        boxShadow: `0 0 8px ${tech.color}60`,
                      }}
                    />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors font-medium">
                      {tech.name}
                    </span>
                    <CheckCircle2
                      size={12}
                      className="ml-auto text-slate-700 group-hover:text-emerald-500 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-900/20 via-transparent to-cyan-900/20 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-gradient-to-b from-transparent via-violet-500/20 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Badge variant="purple" className="mb-6">
            Ready?
          </Badge>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight">
            Stop reading.
            <br />
            <span className="gradient-text">Start coding.</span>
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            Pick a problem. Write a solution. Submit. Watch it run live in
            Docker.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-lg shadow-xl shadow-violet-600/25 hover:shadow-violet-500/35 transition-all duration-200 group"
            >
              Create Free Account
              <ArrowRight
                size={18}
                className="group-hover:translate-x-1 transition-transform"
              />
            </Link>
            <Link
              to="/problems"
              className="inline-flex items-center gap-2 px-8 py-4 border border-[var(--border-bright)] hover:border-violet-500/40 text-slate-300 hover:text-white font-semibold rounded-xl text-lg transition-all duration-200"
            >
              Browse Problems
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
