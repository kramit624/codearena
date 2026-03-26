// import { exec } from "child_process";
// import { promisify } from "util";
// import fs from "fs/promises";
// import path from "path";
// import { v4 as uuidv4 } from "uuid";

// const execAsync = promisify(exec);

// // ── Config ──
// const TIMEOUT_MS = 10000;
// const MEMORY_LIMIT = "100m";
// const CPU_LIMIT = "0.5";
// const PIDS_LIMIT = 50;
// const TEMP_DIR = "./temp";

// // ── Language config ──
// const LANGUAGE_CONFIG = {
//   javascript: {
//     image: "node:18-alpine",
//     extension: "js",
//     command: (fileName) => `node /code/${fileName}`,
//   },
//   python: {
//     image: "python:3.11-alpine",
//     extension: "py",
//     command: (fileName) => `python /code/${fileName}`,
//   },
// };

// // -------------------------------------------------------
// // BUILD RUNNER CODE — wraps user code to call function
// // and print result as JSON to stdout
// // -------------------------------------------------------
// const buildRunnerCode = (language, userCode, functionName, input) => {
//   if (language === "javascript") {
//     return `
// ${userCode}

// try {
//   const result = ${functionName}(...${JSON.stringify(input)});
//   console.log(JSON.stringify({ result }));
// } catch (err) {
//   console.log(JSON.stringify({ error: err.message }));
// }
// `;
//   }

//   if (language === "python") {
//     // Python needs json module to print result
//     // We pass input args by unpacking the input array
//     // JSON.stringify gives us valid Python literals for
//     // numbers, arrays, strings, booleans (true→True fix below)
//     // We'll embed the JSON-serialized input and let Python's json.loads
//     // recover correct Python types (True/False/None) safely.
//     const inputJson = JSON.stringify(input);

//   const snake = "" +
//     functionName.replace(/([A-Z])/g, (m) => "_" + m.toLowerCase());
//   const lower = functionName.toLowerCase();

//   return `
// import json
// import sys

// ${userCode}

// try:
//   # Parse the JSON-serialized input to ensure types are correct in Python
//   args = json.loads(r'''${inputJson}''')
//   func = None
//   # Try exact name
//   if '${functionName}' in globals() and callable(globals()['${functionName}']):
//     func = globals()['${functionName}']
//   # Try snake_case variant
//   elif '${snake}' in globals() and callable(globals()['${snake}']):
//     func = globals()['${snake}']
//   # Try lowercase name
//   elif '${lower}' in globals() and callable(globals()['${lower}']):
//     func = globals()['${lower}']
//   else:
//     # Try matching by name ignoring underscores/case among user-defined functions
//     target = '${functionName}'.lower().replace('_', '')
//     for k, v in globals().items():
//       try:
//         if callable(v) and hasattr(v, '__code__'):
//           if k.lower().replace('_', '') == target:
//             func = v
//             break
//       except Exception:
//         continue
//     # Final fallback: pick first user-defined callable
//     if func is None:
//       for k, v in globals().items():
//         try:
//           if callable(v) and hasattr(v, '__code__') and not k.startswith('__'):
//             func = v
//             break
//         except Exception:
//           continue

//     if func is None:
//       # Collect available user-defined callables for diagnostics
//       available = []
//       for k, v in globals().items():
//         try:
//           if callable(v) and hasattr(v, '__code__') and not k.startswith('__'):
//             available.append(k)
//         except Exception:
//           continue
//       raise NameError(f"Function not found: tried ${functionName}, ${snake}, ${lower}. Available callables: {available}")

//   # Ensure the expected function name exists in globals so callers using the
//   # provided functionName symbol won't get NameError. Create an alias.
//   globals()['${functionName}'] = func

//   result = globals()['${functionName}'](*args)
//   print(json.dumps({"result": result}))
// except Exception as e:
//   print(json.dumps({"error": str(e)}))
// `;
//   }

//   throw new Error(`Unsupported language: ${language}`);
// };

// // -------------------------------------------------------
// // SMART COMPARATOR
// // -------------------------------------------------------
// const smartCompare = ({ actual, expected, input, functionName }) => {
//   const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

//   // Two Sum — any valid pair is correct
//   if (functionName === "twoSum") {
//     const nums = input[0];
//     const target = input[1];

//     if (!Array.isArray(actual) || actual.length !== 2) return false;

//     const [i, j] = actual;
//     if (i === undefined || j === undefined) return false;
//     if (i < 0 || j < 0) return false;
//     if (i >= nums.length || j >= nums.length) return false;
//     if (i === j) return false;

//     return nums[i] + nums[j] === target;
//   }

//   // Sort-insensitive comparisons
//   const SORT_INSENSITIVE = [
//     "groupAnagrams",
//     "findAnagrams",
//     "permutation",
//     "intersect",
//     "intersection",
//   ];

//   if (
//     SORT_INSENSITIVE.some((fn) =>
//       functionName.toLowerCase().includes(fn.toLowerCase()),
//     )
//   ) {
//     if (Array.isArray(actual) && Array.isArray(expected)) {
//       return (
//         JSON.stringify([...actual].sort()) ===
//         JSON.stringify([...expected].sort())
//       );
//     }
//   }

//   return deepEqual(actual, expected);
// };

// // -------------------------------------------------------
// // RUN ONE TEST CASE INSIDE DOCKER
// // -------------------------------------------------------
// const runSingleTestCase = async (
//   language,
//   userCode,
//   functionName,
//   testCase,
//   jobDir,
// ) => {
//   const langConfig = LANGUAGE_CONFIG[language];
//   if (!langConfig) throw new Error(`Unsupported language: ${language}`);

//   const tcId = uuidv4();
//   const fileName = `tc_${tcId}.${langConfig.extension}`;
//   const filePath = path.join(jobDir, fileName);
//   const startTime = Date.now();

//   try {
//     // 1. Write code file
//     await fs.writeFile(
//       filePath,
//       buildRunnerCode(language, userCode, functionName, testCase.input),
//     );

//     // 2. Build docker command
//     const dockerCmd = [
//       "docker run",
//       "--rm",
//       "--init",
//       "--network none",
//       `--memory="${MEMORY_LIMIT}"`,
//       `--cpus="${CPU_LIMIT}"`,
//       `--pids-limit=${PIDS_LIMIT}`,
//       "--read-only",
//       `--tmpfs /tmp:rw,size=10m`,
//       `-v "${path.resolve(jobDir)}:/code:ro"`,
//       langConfig.image,
//       langConfig.command(fileName),
//     ].join(" ");

//     // 3. Race docker vs timeout
//     const { stdout, stderr } = await Promise.race([
//       execAsync(dockerCmd, { timeout: 15000 }),
//       new Promise((_, reject) =>
//         setTimeout(() => reject(new Error("TLE")), TIMEOUT_MS),
//       ),
//     ]);

//     const executionTime = Date.now() - startTime;

//     // 4. Parse stdout
//     const raw = stdout.trim();
//     if (!raw) {
//       return {
//         input: testCase.input,
//         expected: testCase.expected,
//         actual: null,
//         passed: false,
//         error: stderr || "No output produced",
//         rawOutput: raw,
//         rawStderr: stderr,
//         executionTime,
//       };
//     }

//     // The user's code may print to stdout which can pollute the runner's
//     // JSON output. Try parsing the full stdout first, and if that fails,
//     // attempt to locate the last JSON-looking line and parse that. If we
//     // still can't parse, return a helpful error that includes the raw
//     // output for debugging.
//     let parsed = null;
//     try {
//       parsed = JSON.parse(raw);
//     } catch (parseErr) {
//       // Try to extract a JSON-looking substring (prefer last non-empty line)
//       const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
//       for (let i = lines.length - 1; i >= 0; i--) {
//         const line = lines[i];
//         if (line.startsWith("{") || line.startsWith("[")) {
//           try {
//             parsed = JSON.parse(line);
//             break;
//           } catch (_) {
//             // continue searching
//           }
//         }
//       }
//       if (!parsed) {
//         // Log runner file to server logs to help debugging (best-effort)
//         try {
//           const runnerContents = await fs.readFile(filePath, "utf8").catch(() => "<unavailable>");
//           console.error("Failed to parse runner stdout JSON. raw stdout:\n", raw);
//           console.error("Runner file contents:\n", runnerContents);
//         } catch (e) {
//           // ignore logging errors
//         }

//         return {
//           input: testCase.input,
//           expected: testCase.expected,
//           actual: null,
//           passed: false,
//           error: `Failed to parse runner output: ${parseErr.message}. Raw output: ${raw}`,
//           executionTime,
//         };
//       }
//     }

//     if (parsed.error) {
//         return {
//           input: testCase.input,
//           expected: testCase.expected,
//           actual: null,
//           passed: false,
//           error: parsed.error,
//           rawOutput: raw,
//           rawStderr: stderr,
//           executionTime,
//         };
//     }

//     const actual = parsed.result;
//     const passed = smartCompare({
//       actual,
//       expected: testCase.expected,
//       input: testCase.input,
//       functionName,
//     });

//     return {
//       input: testCase.input,
//       expected: testCase.expected,
//       actual,
//       passed,
//       error: null,
//       executionTime,
//     };
//   } catch (err) {
//     const executionTime = Date.now() - startTime;

//     if (err.message === "TLE") {
//       return {
//         input: testCase.input,
//         expected: testCase.expected,
//         actual: "Time Limit Exceeded",
//         passed: false,
//         error: "Time Limit Exceeded",
//         executionTime,
//       };
//     }

//         return {
//           input: testCase.input,
//           expected: testCase.expected,
//           actual: null,
//           passed: false,
//           error: err.message,
//           rawOutput: stdout,
//           rawStderr: stderr,
//           executionTime,
//         };
//   } finally {
//     await fs.unlink(filePath).catch(() => {});
//   }
// };

// // -------------------------------------------------------
// // RUN ALL TEST CASES
// // -------------------------------------------------------
// export const runInDocker = async ({
//   language = "javascript",
//   code,
//   functionName,
//   testCases,
// }) => {
//   // Validate language
//   if (!LANGUAGE_CONFIG[language]) {
//     throw new Error(
//       `Unsupported language: ${language}. Supported: javascript, python`,
//     );
//   }

//   const jobId = uuidv4();
//   const jobDir = path.join(TEMP_DIR, jobId);
//   await fs.mkdir(jobDir, { recursive: true });

//   try {
//     const results = [];

//     for (const tc of testCases) {
//       const result = await runSingleTestCase(
//         language,
//         code,
//         functionName,
//         tc,
//         jobDir,
//       );
//       results.push(result);
//     }

//     return results;
//   } finally {
//     await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});
//     console.log(`🧹 Cleaned temp: ${jobDir}`);
//   }
// };



// ===============================
// ❌ DOCKER SANDBOX (KEEP FOR FUTURE)
// ===============================

// import { exec } from "child_process";
// import Docker logic here when you move to VPS



// ===============================
// ✅ TEMP SAFE MULTI-LANG RUNNER
// ===============================

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const execAsync = promisify(exec);

const TEMP_DIR = "./temp";

// 🔥 SAFETY LIMITS
const TIMEOUT = 2000; // prevent infinite loops
const MAX_BUFFER = 1024 * 1024; // 1MB output



// ===============================
// 🔥 ENSURE TEMP ROOT EXISTS
// ===============================
const ensureTempRoot = async () => {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (err) {
    console.error("❌ Failed to create temp root:", err.message);
  }
};



// ===============================
// LANGUAGE CONFIG
// ===============================
const LANGUAGE_CONFIG = {
  javascript: {
    extension: "js",
    run: (file) => `node ${file}`,
  },
  python: {
    extension: "py",
    run: (file) => `python3 ${file} || python ${file}`,
  },
};



// ===============================
// BUILD RUNNER CODE
// ===============================
const buildRunnerCode = (language, code, functionName, input) => {
  if (language === "javascript") {
    return `
"use strict";

${code}

try {
  const result = ${functionName}(...${JSON.stringify(input)});
  console.log(JSON.stringify({ result }));
} catch (err) {
  console.log(JSON.stringify({ error: err.message }));
}
`;
  }

  if (language === "python") {
    return `
import json

${code}

try:
    args = json.loads('${JSON.stringify(input)}')
    result = ${functionName}(*args)
    print(json.dumps({"result": result}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;
  }
};



// ===============================
// SMART COMPARATOR
// ===============================
const smartCompare = ({ actual, expected, input, functionName }) => {
  const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  if (functionName === "twoSum") {
    const nums = input[0];
    const target = input[1];

    if (!Array.isArray(actual) || actual.length !== 2) return false;

    const [i, j] = actual;
    if (i === j) return false;

    return nums[i] + nums[j] === target;
  }

  return deepEqual(actual, expected);
};



// ===============================
// RUN SINGLE TEST
// ===============================
const runSingleTest = async (
  language,
  code,
  functionName,
  testCase,
  jobDir
) => {
  const config = LANGUAGE_CONFIG[language];
  if (!config) throw new Error("Unsupported language");

  const fileName = `${uuidv4()}.${config.extension}`;
  const filePath = path.join(jobDir, fileName);

  const start = Date.now();

  try {
    // write temp file
    await fs.writeFile(
      filePath,
      buildRunnerCode(language, code, functionName, testCase.input)
    );

    // execute safely
    const { stdout } = await execAsync(config.run(filePath), {
      timeout: TIMEOUT,
      maxBuffer: MAX_BUFFER,
      killSignal: "SIGKILL",
    });

    const executionTime = Date.now() - start;

    const raw = stdout.trim();

    if (!raw) {
      return {
        input: testCase.input,
        expected: testCase.expected,
        actual: null,
        passed: false,
        error: "No output",
        executionTime,
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        input: testCase.input,
        expected: testCase.expected,
        actual: raw,
        passed: false,
        error: "Invalid output format",
        executionTime,
      };
    }

    if (parsed.error) {
      return {
        input: testCase.input,
        expected: testCase.expected,
        actual: null,
        passed: false,
        error: parsed.error,
        executionTime,
      };
    }

    const actual = parsed.result;

    const passed = smartCompare({
      actual,
      expected: testCase.expected,
      input: testCase.input,
      functionName,
    });

    return {
      input: testCase.input,
      expected: testCase.expected,
      actual,
      passed,
      error: null,
      executionTime,
    };
  } catch (err) {
    const executionTime = Date.now() - start;

    // 🔥 TLE
    if (err.killed || err.signal === "SIGKILL") {
      return {
        input: testCase.input,
        expected: testCase.expected,
        actual: "Time Limit Exceeded",
        passed: false,
        error: "Time Limit Exceeded",
        executionTime,
      };
    }

    // 🔥 Output overflow
    if (err.message.includes("maxBuffer")) {
      return {
        input: testCase.input,
        expected: testCase.expected,
        actual: null,
        passed: false,
        error: "Output Limit Exceeded",
        executionTime,
      };
    }

    return {
      input: testCase.input,
      expected: testCase.expected,
      actual: err.message,
      passed: false,
      error: err.message,
      executionTime,
    };
  } finally {
    try {
      await fs.unlink(filePath);
    } catch {}
  }
};



// ===============================
// MAIN FUNCTION (FINAL)
// ===============================
export const runInDocker = async ({
  language = "javascript",
  code,
  functionName,
  testCases,
}) => {
  await ensureTempRoot();

  const jobId = uuidv4();
  const jobDir = path.join(TEMP_DIR, jobId);

  try {
    await fs.mkdir(jobDir, { recursive: true });

    const results = [];

    for (const tc of testCases) {
      const res = await runSingleTest(
        language,
        code,
        functionName,
        tc,
        jobDir
      );
      results.push(res);
    }

    return results;
  } catch (err) {
    console.error("❌ Execution error:", err.message);
    throw err;
  } finally {
    try {
      await fs.rm(jobDir, { recursive: true, force: true });
      console.log(`🧹 Cleaned temp: ${jobDir}`);
    } catch (cleanupErr) {
      console.warn("⚠️ Cleanup failed:", cleanupErr.message);
    }
  }
};