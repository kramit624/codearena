import mongoose from "mongoose";
import dotenv from "dotenv";
import fetch from "node-fetch";
import Question from "../src/models/question.model.js";

dotenv.config();

/* =========================
   CONFIG
========================= */
const OLLAMA_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "mistral";
const TOTAL_QUESTIONS = 100;
const MAX_INPUT_SIZE = 8000;
const MAX_RETRIES = 4;

/* =========================
   DIFFICULTY + TOPICS
========================= */
const DIFFICULTY_MIX = [
  ...Array(40).fill("easy"),
  ...Array(40).fill("medium"),
  ...Array(20).fill("hard"),
];

const TOPICS = [
  "arrays",
  "strings",
  "linked lists",
  "stacks",
  "queues",
  "hashmaps",
  "binary search",
  "sorting",
  "recursion",
  "sliding window",
  "two pointers",
  "dynamic programming",
  "greedy",
  "trees",
  "graphs",
];

/* =========================
   PROMPT
========================= */
const buildPrompt = (difficulty, topic) => `
You are a LeetCode problem setter.

STRICT RULES:
- Return ONLY valid JSON
- NO Math.pow, NO 1e5, NO expressions
- Use only literal values
- EXACTLY 15 testCases (3 visible, 12 hidden)
- ALL testCases must have SAME argument count
- Use "expected", NOT "output"
- Description MUST match function logic exactly
- DO NOT stringify arrays (no "[1,2,3]")

Schema:
{
 "title": "...",
 "description": "...",
 "difficulty": "${difficulty}",
 "tags": ["${topic}"],
 "functionName": "camelCase",
 "starterCode": {
   "javascript": "function name(a,b){ return null; }",
   "python": "def name(a,b): return None"
 },
 "testCases":[
   {"input":[...], "expected":..., "isHidden":false}
 ]
}
`;

/* =========================
   API CALL
========================= */
const generateQuestion = async (difficulty, topic) => {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: buildPrompt(difficulty, topic),
      stream: false,
      options: { temperature: 0.6, num_predict: 4096 },
    }),
  });

  const data = await res.json();
  return data.response;
};

/* =========================
   SANITIZE
========================= */
const sanitize = (text) => {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/\n/g, " ")
    .replace(/Math\.pow\((\d+),\s*(\d+)\)/g, (_, a, b) => Math.pow(a, b))
    .replace(/(\d+)e(\d+)/gi, (_, a, b) => Number(a) * Math.pow(10, b))
    .replace(/Infinity/g, "999999999")
    .replace(/NaN/g, "0")
    .replace(/undefined/g, "null");
};

/* =========================
   FIX STRING ARRAYS
========================= */
const tryParseArrayString = (val) => {
  if (typeof val === "string" && val.startsWith("[") && val.endsWith("]")) {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

/* =========================
   NORMALIZE TEST CASES
========================= */
const normalizeTestCases = (testCases) => {
  // output → expected
  testCases.forEach((tc) => {
    if (tc.output !== undefined && tc.expected === undefined) {
      tc.expected = tc.output;
      delete tc.output;
    }
  });

  // parse string arrays
  testCases.forEach((tc) => {
    tc.input = tc.input.map(tryParseArrayString);
  });

  // remove invalid test cases
  testCases = testCases.filter(
    (tc) =>
      Array.isArray(tc.input) &&
      tc.input.length > 0 &&
      tc.expected !== undefined &&
      JSON.stringify(tc.input).length < MAX_INPUT_SIZE,
  );

  // fix arg count
  const freq = {};
  testCases.forEach((tc) => {
    const len = tc.input.length;
    freq[len] = (freq[len] || 0) + 1;
  });

  const correctLength = Number(
    Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0],
  );

  return testCases.filter((tc) => tc.input.length === correctLength);
};

/* =========================
   VALIDATE QUESTION
========================= */
const validateQuestion = (q) => {
  if (!q.title || !q.functionName) return false;
  if (!Array.isArray(q.testCases)) return false;
  if (q.testCases.length < 8) return false;

  for (const tc of q.testCases) {
    for (const arg of tc.input) {
      if (typeof arg === "string" && arg.startsWith("[")) {
        return false; // reject stringified arrays
      }
    }
  }

  return true;
};

/* =========================
   PARSE
========================= */
const parseQuestion = (raw) => {
  try {
    const cleaned = sanitize(raw);

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;

    const parsed = JSON.parse(cleaned.slice(start, end + 1));

    parsed.testCases = normalizeTestCases(parsed.testCases);

    if (!validateQuestion(parsed)) return null;

    return parsed;
  } catch {
    return null;
  }
};

/* =========================
   MAIN SEED
========================= */
const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  await Question.deleteMany({});
  console.log("🗑️ Cleared existing questions\n");

  let success = 0;
  let fail = 0;

  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    const difficulty = DIFFICULTY_MIX[i];
    const topic = TOPICS[i % TOPICS.length];

    console.log(`⏳ ${i + 1}/${TOTAL_QUESTIONS} — ${difficulty}`);

    let parsed = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const raw = await generateQuestion(difficulty, topic);

        parsed = parseQuestion(raw);

        if (parsed) break;

        console.log(`   🔄 retry ${attempt + 1}`);
      } catch {}
    }

    if (!parsed) {
      fail++;
      console.log("   ❌ skipped\n");
      continue;
    }

    const exists = await Question.findOne({ title: parsed.title });
    if (exists) {
      fail++;
      console.log("   ⚠️ duplicate\n");
      continue;
    }

    await Question.create(parsed);
    success++;

    console.log("   ✅ saved\n");
  }

  console.log("================================");
  console.log(`✅ success: ${success}`);
  console.log(`❌ fail: ${fail}`);
  console.log("================================");

  await mongoose.disconnect();
  process.exit();
};

seed();
