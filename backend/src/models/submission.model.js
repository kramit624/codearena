import mongoose from "mongoose";

const testResultSchema = new mongoose.Schema({
  input: { type: mongoose.Schema.Types.Mixed },
  expected: { type: mongoose.Schema.Types.Mixed },
  actual: { type: mongoose.Schema.Types.Mixed },
  passed: { type: Boolean },
  error: { type: String, default: null }, // runtime error message if any
  executionTime: { type: Number, default: 0 }, // ms
});

const submissionSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },

    code: {
      type: String,
      required: true,
    },

    language: {
      type: String,
      enum: ["javascript", "python"],
      default: "javascript",
    },

    status: {
      type: String,
      enum: ["pending", "running", "accepted", "wrong_answer", "error", "tle"],
      default: "pending",
    },

    testResults: [testResultSchema],

    passedCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },

    // execution stats
    executionTime: { type: Number, default: 0 }, // ms
    memoryUsed: { type: Number, default: 0 }, // MB
  },
  { timestamps: true },
);

const Submission = mongoose.model("Submission", submissionSchema);
export default Submission;
