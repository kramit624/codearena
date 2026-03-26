import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

const app = express();

// --- CORS ---
// Tells browser: "yes, this frontend is allowed to talk to me"
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true, // MUST be true to allow cookies cross-origin
  }),
);

// --- Body parsers ---
app.use(express.json()); // parse JSON body
app.use(express.urlencoded({ extended: true })); // parse form data

// --- Cookie parser ---
// Lets us read req.cookies in any route
app.use(cookieParser());

// --- Security headers (CSP) ---
const clientOrigin = process.env.CLIENT_URL || "http://localhost:5173";
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", clientOrigin],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  }),
);

// --- Routes (we'll plug in as we build) ---
import authRoutes from "./routes/auth.route.js";
import questionRoutes from "./routes/question.route.js";
import userRoutes from "./routes/user.routes.js";

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/questions", questionRoutes);
app.use("/api/v1/users", userRoutes);

// backend health check route
app.get("/api/v1/", (req, res) => {
  res.json({ ok: true, message: "Backend is healthy" });
});

export default app;
