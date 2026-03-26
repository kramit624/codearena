import Question from "../models/question.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import { runCode } from "../utils/codeRunner.js";
import { v4 as uuidv4 } from "uuid";
import submissionQueue from "../queues/submissionQueue.js";
import Submission from "../models/submission.model.js";

/* =======================================================
   HELPER VALIDATIONS
======================================================= */

// check if value is plain array (not stringified)
const isValidInputArray = (input) => {
  return Array.isArray(input);
};

// prevent stringified arrays like "[1,2,3]"
const containsStringifiedArray = (input) => {
  return input.some((arg) => typeof arg === "string" && arg.startsWith("["));
};

// validate all test cases deeply
const validateTestCases = (testCases) => {
  if (!Array.isArray(testCases) || testCases.length < 3) {
    return "At least 3 test cases required";
  }

  // check each test case
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];

    if (!isValidInputArray(tc.input)) {
      return `testCase[${i}] input must be an array`;
    }

    if (tc.expected === undefined) {
      return `testCase[${i}] missing expected field`;
    }

    if (containsStringifiedArray(tc.input)) {
      return `testCase[${i}] contains stringified array`;
    }
  }

  // check argument consistency
  const argLengths = testCases.map((tc) => tc.input.length);
  const uniqueLengths = new Set(argLengths);

  if (uniqueLengths.size !== 1) {
    return "All test cases must have same number of arguments";
  }

  return null;
};

// validate starter code matches functionName
const validateStarterCode = (starterCode, functionName) => {
  if (!starterCode?.javascript) {
    return "Missing javascript starterCode";
  }

  if (!starterCode.javascript.includes(`function ${functionName}`)) {
    return "functionName must match javascript starterCode";
  }

  if (starterCode.javascript.includes("readFileSync")) {
    return "stdin usage not allowed";
  }

  if (starterCode.javascript.includes("console.log")) {
    return "console.log not allowed";
  }

  return null;
};

/* =======================================================
   GET ALL QUESTIONS
======================================================= */
export const getAllQuestions = async (req, res) => {
  try {
    const { difficulty, tag } = req.query;

    const filter = {};
    if (difficulty) filter.difficulty = difficulty;
    if (tag) filter.tags = tag;

    const questions = await Question.find(filter)
      .select("-testCases -starterCode")
      .sort({ createdAt: -1 });

    return res.status(200).json(
      new ApiResponse(200, "Questions fetched", {
        count: questions.length,
        questions,
      }),
    );
  } catch (error) {
    console.error("getAllQuestions error:", error);
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};

/* =======================================================
   GET SINGLE QUESTION
======================================================= */
export const getQuestionById = async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await Question.findById(questionId);

    if (!question) {
      return res.status(404).json(new ApiResponse(404, "Question not found"));
    }


    // show only visible test cases
    const visibleTestCases = question.testCases.filter((tc) => !tc.isHidden);

    return res.status(200).json(
      new ApiResponse(200, "Question fetched", {
        ...question.toObject(),
        starterCode: Object.fromEntries(question.starterCode),
        testCases: visibleTestCases,
      }),
    );
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json(new ApiResponse(400, "Invalid question ID"));
    }

    console.error("getQuestionById error:", error);
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};

/* =======================================================
   CREATE QUESTION (ADMIN)
======================================================= */
export const createQuestion = async (req, res) => {
  try {
    const {
      title,
      description,
      difficulty,
      tags,
      testCases,
      starterCode,
      functionName,
    } = req.body;

    /* ---------- BASIC VALIDATION ---------- */
    if (!title || !description || !difficulty || !testCases || !functionName) {
      return res
        .status(400)
        .json(new ApiResponse(400, "Missing required fields"));
    }

    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return res.status(400).json(new ApiResponse(400, "Invalid difficulty"));
    }

    /* ---------- TEST CASE VALIDATION ---------- */
    const testCaseError = validateTestCases(testCases);
    if (testCaseError) {
      return res.status(400).json(new ApiResponse(400, testCaseError));
    }

    /* ---------- STARTER CODE VALIDATION ---------- */
    const starterError = validateStarterCode(starterCode, functionName);
    if (starterError) {
      return res.status(400).json(new ApiResponse(400, starterError));
    }

    /* ---------- CREATE ---------- */
    const question = await Question.create({
      title,
      description,
      difficulty,
      tags: tags || [],
      testCases,
      starterCode: starterCode || {},
      functionName,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, "Question created", question));
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json(new ApiResponse(409, "Question already exists"));
    }

    console.error("createQuestion error:", error);
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};

/* =======================================================
   DELETE QUESTION
======================================================= */
export const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await Question.findByIdAndDelete(questionId);

    if (!question) {
      return res.status(404).json(new ApiResponse(404, "Question not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "Question deleted successfully"));
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json(new ApiResponse(400, "Invalid question ID"));
    }

    console.error("deleteQuestion error:", error);
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};

/* =======================================================
   Submit Answer
======================================================= */


export const submitCode = async (req, res) => {
  try {
    const { questionId, code, language = "javascript" } = req.body;
    const userId = req.user._id; // from verifyJWT middleware

    // 1. Basic validation
    if (!questionId || !code) {
      return res
        .status(400)
        .json(new ApiResponse(400, "questionId and code are required"));
    }

    // 2. Check question exists
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json(new ApiResponse(404, "Question not found"));
    }

    // 3. Generate unique job ID
    const jobId = uuidv4();

    // 4. Create pending submission in DB immediately
    await Submission.create({
      jobId,
      userId,
      questionId,
      code,
      language,
      status: "pending",
    });

    // 5. Add to BullMQ queue
    await submissionQueue.add(
      "submit",
      {
        jobId,
        userId: userId.toString(),
        questionId: questionId.toString(),
        code,
        language,
      },
      { jobId }, // use same jobId as BullMQ job ID for easy tracking
    );

    // 6. Return immediately — don't wait for execution
    return res.status(202).json(
      new ApiResponse(202, "Submission received", {
        jobId,
        status: "pending",
        message: "Poll GET /api/v1/questions/submission/:jobId for result",
      }),
    );
  } catch (err) {
    console.error("submitCode error:", err);
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};

// ── GET SUBMISSION STATUS ──
// User polls this to get their result
export const getSubmissionStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    const submission = await Submission.findOne({ jobId }).populate(
      "questionId",
      "title difficulty functionName",
    );

    if (!submission) {
      return res.status(404).json(new ApiResponse(404, "Submission not found"));
    }

    // If still pending/running — tell frontend to keep polling
    if (["pending", "running"].includes(submission.status)) {
      return res.status(200).json(
        new ApiResponse(200, "Still processing", {
          jobId,
          status: submission.status,
        }),
      );
    }

    // AFTER — uses actual isHidden field from question model
    // question is already populated above via .populate()
    // but we need testCases too, so fetch it separately
    const questionWithCases = await Question.findById(
      submission.questionId,
    ).select("testCases functionName title difficulty");

    const sanitizedResults = submission.testResults.map((r, idx) => {
      // get the original test case to read isHidden correctly
      const originalTc = questionWithCases?.testCases?.[idx];
      const isHidden = originalTc?.isHidden ?? false;

      if (isHidden) {
        // hidden test case — only reveal pass/fail, nothing else
        return {
          testIndex: idx + 1,
          passed: r.passed,
          error: r.error || null,
          executionTime: r.executionTime || 0,
          isHidden: true,
        };
      }

      // visible test case — show everything
      return {
        testIndex: idx + 1,
        passed: r.passed,
        error: r.error || null,
        executionTime: r.executionTime || 0,
        isHidden: false,
        input: r.input,
        expected: r.expected,
        actual: r.actual,
      };
    });

    return res.status(200).json(
      new ApiResponse(200, "Submission result", {
        jobId,
        status: submission.status,
        passedCount: submission.passedCount,
        totalCount: submission.totalCount,
        executionTime: submission.executionTime,
        results: sanitizedResults,
        submittedAt: submission.createdAt,
      }),
    );
  } catch (err) {
    console.error("getSubmissionStatus error:", err);
    return res.status(500).json(new ApiResponse(500, "Server error"));
  }
};