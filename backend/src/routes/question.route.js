import { Router } from "express";
import {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  deleteQuestion,
  submitCode,
  getSubmissionStatus,
} from "../controllers/question.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import isAdmin from "../middlewares/admin.middleware.js";

const router = Router();

// ── Public ──
router.get("/", getAllQuestions);
router.get("/:questionId", getQuestionById);

// ── Protected ──
router.post("/submit", verifyJWT, submitCode);
router.get("/submission/:jobId", verifyJWT, getSubmissionStatus);

// ── Admin ──
router.post("/", verifyJWT, isAdmin, createQuestion);
router.delete("/:questionId", verifyJWT, isAdmin, deleteQuestion);

export default router;
