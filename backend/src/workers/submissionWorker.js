import { Worker } from "bullmq";
import mongoose from "mongoose";
import dotenv from "dotenv";
import redis from "../config/redis.js";
import Submission from "../models/submission.model.js";
import Question from "../models/question.model.js";
import { runInDocker } from "../services/dockerSandbox.js";

dotenv.config();

// Connect to MongoDB (worker runs as separate process)
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Worker: MongoDB connected"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

// ── Process each job ──
const processSubmission = async (job) => {
  const { jobId, userId, questionId, code, language } = job.data;

  console.log(`🔥 Processing job: ${jobId}`);

  // 1. Mark as running
  await Submission.findOneAndUpdate({ jobId }, { status: "running" });

  // 2. Fetch question + all test cases (including hidden)
  const question = await Question.findById(questionId);
  if (!question) throw new Error("Question not found");

  // 3. Run in Docker
  const testResults = await runInDocker({
    language,
    code,
    functionName: question.functionName,
    testCases: question.testCases, // ALL test cases including hidden
  });

  // 4. Calculate verdict
  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;
  const hasTLE = testResults.some((r) => r.error === "Time Limit Exceeded");
  const hasError = testResults.some(
    (r) => r.error && r.error !== "Time Limit Exceeded",
  );

  let status = "accepted";
  if (hasTLE) status = "tle";
  else if (hasError && passedCount === 0) status = "error";
  else if (passedCount < totalCount) status = "wrong_answer";

  // 5. Average execution time
  const avgTime = Math.round(
    testResults.reduce((sum, r) => sum + (r.executionTime || 0), 0) /
      totalCount,
  );

  // 6. Save final result to DB
  await Submission.findOneAndUpdate(
    { jobId },
    {
      status,
      testResults,
      passedCount,
      totalCount,
      executionTime: avgTime,
    },
  );

  // Log detailed errors for any failing test cases to help debugging
  testResults.forEach((r, idx) => {
    if (r.error) {
      console.error(`Job ${jobId} test#${idx + 1} error:`, r.error);
      if (r.rawOutput) console.error(`Raw stdout:\n${r.rawOutput}`);
      if (r.rawStderr) console.error(`Raw stderr:\n${r.rawStderr}`);
    }
  });

  // 7. If accepted, increment question's solvedCount
  if (status === "accepted") {
    await Question.findByIdAndUpdate(questionId, { $inc: { solvedCount: 1 } });
  }

  console.log(
    `✅ Job done: ${jobId} | ${status} | ${passedCount}/${totalCount}`,
  );

  return { status, passedCount, totalCount };
};

// ── Create BullMQ Worker ──
const worker = new Worker("submissions", processSubmission, {
  connection: redis,
  concurrency: 3, // process 3 jobs at a time max
});

worker.on("completed", (job) => {
  console.log(`✅ Job completed: ${job.id}`);
});

worker.on("failed", async (job, err) => {
  console.error(`❌ Job failed: ${job.id} — ${err.message}`);

  // Mark submission as failed in DB
  await Submission.findOneAndUpdate(
    { jobId: job.data.jobId },
    { status: "failed" },
  ).catch(() => {});
});

console.log("🚀 Submission worker started, waiting for jobs...");
