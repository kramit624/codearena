import mongoose from "mongoose";

const testCaseSchema = new mongoose.Schema(
  {
    input: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    expected: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      unique: true,
    },

    description: {
      type: String,
      required: [true, "Description is required"],
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },

    tags: {
      type: [String], // array of strings e.g. ["array", "greedy", "sorting"]
      default: [],
    },

    testCases: {
      type: [testCaseSchema],
      validate: [
        {
          validator: (arr) => arr.length >= 3,
          message: "At least 3 test cases required",
        },
        {
          validator: (arr) => {
            // all inputs must be arrays
            return arr.every((tc) => Array.isArray(tc.input));
          },
          message: "Each testCase.input must be an array",
        },
        {
          validator: (arr) => {
            // all test cases must have same argument count
            const lengths = arr.map((tc) => tc.input.length);
            return new Set(lengths).size === 1;
          },
          message: "All test cases must have same number of arguments",
        },
      ],
    },

    starterCode: {
      // Code template shown to user in the editor when they open the question
      type: Map,
      of: String,
      // e.g. { javascript: "function maxArray(arr) {\n  // your code\n}", python: "def max_array(arr):\n    pass" }
      default: {},
    },

    functionName: {
      type: String,
      required: true,
      // e.g. "maxArray" — used by sandbox to call user's function
    },

    // How many users solved this question — useful for stats later
    solvedCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// Index for fast filtering by difficulty and tags
questionSchema.index({ difficulty: 1 });
questionSchema.index({ tags: 1 });

const Question = mongoose.model("Question", questionSchema);
export default Question;
