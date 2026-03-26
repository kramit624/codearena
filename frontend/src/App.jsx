import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Problems from "./pages/Problems";
import ProblemDetail from "./pages/ProblemDetail.jsx";
import Profile from "./pages/Profile.jsx";
import Progress from "./pages/Progress.jsx";
import Settings from "./pages/Settings.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";


function App() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/problems" element={<Problems />} />
        <Route path="/problems/:questionId" element={<ProblemDetail />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        {/* More routes to be added */}
        <Route
          path="*"
          element={
            <div className="flex items-center justify-center min-h-screen pt-16">
              <div className="text-center">
                <div className="text-8xl font-black gradient-text mb-4">
                  404
                </div>
                <p className="text-slate-500 mb-6">Page not found</p>
                <a
                  href="/"
                  className="text-violet-400 hover:text-violet-300 text-sm underline"
                >
                  Go home
                </a>
              </div>
            </div>
          }
        />
      </Routes>

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#13131f",
            color: "#f1f5f9",
            border: "1px solid #2d2d45",
            borderRadius: "12px",
            fontSize: "13px",
            fontFamily: "'Poppins', sans-serif",
          },
          success: {
            iconTheme: { primary: "#10b981", secondary: "#13131f" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#13131f" },
          },
        }}
      />
    </div>
  );
}

export default App;
