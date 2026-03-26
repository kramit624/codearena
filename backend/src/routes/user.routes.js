import { Router } from "express";
import {
  getSolvedQuestions,
  getMySubmissions,
  getMyStats,
  getMyProfile,
  updateUser,
  deleteUser,
  getSubmissionsHeatmap,
  getLeaderboard,
} from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

// All user routes are protected
router.use(verifyJWT);

// Get user's solved questions, submissions, stats, profile, and leaderboard
router.get("/solved", getSolvedQuestions);
router.get("/submissions", getMySubmissions);
router.get("/submissions/heatmap", getSubmissionsHeatmap);
router.get("/stats", getMyStats);
router.get("/me", getMyProfile);
router.get("/leaderboard", getLeaderboard);

// Allow users to update their profile and delete their account
router.patch("/me", updateUser);
router.delete("/me", deleteUser);

export default router;
