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


import { exec, execSync } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const execAsync = promisify(exec);

// ===============================
// CONFIG
// ===============================
const TEMP_DIR  = "./temp";
const TIMEOUT   = 5000;       // 5 seconds
const MAX_BUFFER = 1024 * 1024; // 1MB

// ===============================
// DETECT PYTHON BINARY AT STARTUP
// ===============================
const getPythonBin = () => {
  const candidates = [
    "python3",
    "python3.12",
    "python3.11",
    "python3.10",
    "python3.9",
    "python",
    "py",
  ];
  for (const bin of candidates) {
    try {
      execSync(`${bin} --version`, { stdio: "ignore" });
      console.log(`✅ Python binary found: ${bin}`);
      return bin;
    } catch (_) {
      continue;
    }
  }
  console.warn("⚠️  No Python binary found — Python submissions will fail");
  return null;
};

const PYTHON_BIN = getPythonBin();

// ===============================
// LANGUAGE CONFIG
// ===============================
const LANGUAGE_CONFIG = {
  javascript: {
    extension: "js",
    run: (file) => `node "${file}"`,
  },
  python: {
    extension: "py",
    run: (file) => {
      if (!PYTHON_BIN) {
        throw new Error(
          "Python is not installed on this server. Contact admin."
        );
      }
      return `"${PYTHON_BIN}" "${file}"`;
    },
  },
};

// ===============================
// ENSURE TEMP ROOT EXISTS
// ===============================
const ensureTempRoot = async () => {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (err) {
    console.error("❌ Failed to create temp root:", err.message);
  }
};

// ===============================
// BUILD RUNNER CODE
// ===============================
const buildRunnerCode = (language, code, functionName, input) => {
  // ── JavaScript ──────────────────────────────────────────────────────────
  if (language === "javascript") {
    return `
"use strict";

${code}

try {
  const _result = ${functionName}(...${JSON.stringify(input)});
  process.stdout.write(JSON.stringify({ result: _result }) + "\\n");
} catch (_err) {
  process.stdout.write(JSON.stringify({ error: _err.message }) + "\\n");
}
`;
  }

  // ── Python ───────────────────────────────────────────────────────────────
  if (language === "python") {
    // Use base64 to safely pass input — avoids ALL quote/escape issues
    const inputB64 = Buffer.from(JSON.stringify(input)).toString("base64");

    // Pre-compute name variants so Python doesn't need to do it
    const snake = functionName.replace(/([A-Z])/g, (m) => "_" + m.toLowerCase());
    const lower = functionName.toLowerCase();

    return `
import json
import base64
import sys

${code}

try:
    # Decode input safely via base64
    _raw  = base64.b64decode("${inputB64}").decode("utf-8")
    _args = json.loads(_raw)

    # Resolve function — try all name variants
    _func       = None
    _candidates = ${JSON.stringify([functionName, snake, lower])}

    for _name in _candidates:
        _f = globals().get(_name)
        if _f is not None and callable(_f):
            _func = _f
            break

    # Fallback — scan globals ignoring case + underscores
    if _func is None:
        _target = "${functionName}".lower().replace("_", "")
        for _k, _v in list(globals().items()):
            try:
                if (
                    callable(_v)
                    and hasattr(_v, "__code__")
                    and not _k.startswith("_")
                    and _k.lower().replace("_", "") == _target
                ):
                    _func = _v
                    break
            except Exception:
                continue

    # Last resort — first user-defined callable
    if _func is None:
        for _k, _v in list(globals().items()):
            try:
                if (
                    callable(_v)
                    and hasattr(_v, "__code__")
                    and not _k.startswith("_")
                ):
                    _func = _v
                    break
            except Exception:
                continue

    if _func is None:
        _available = [
            _k for _k, _v in globals().items()
            if callable(_v) and hasattr(_v, "__code__") and not _k.startswith("_")
        ]
        raise NameError(
            f"Function not found: tried ${functionName}, ${snake}, ${lower}. "
            f"Available: {_available}"
        )

    _result = _func(*_args)
    sys.stdout.write(json.dumps({"result": _result}) + "\\n")

except Exception as _e:
    sys.stdout.write(json.dumps({"error": str(_e)}) + "\\n")
`;
  }

  throw new Error(`Unsupported language: ${language}`);
};

// ===============================
// SMART COMPARATOR
// ===============================
const smartCompare = ({ actual, expected, input, functionName }) => {
  const deepEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // Two Sum — any valid index pair is acceptable
  if (functionName === "twoSum") {
    const nums   = input[0];
    const target = input[1];

    if (!Array.isArray(actual) || actual.length !== 2) return false;

    const [i, j] = actual;
    if (i === undefined || j === undefined) return false;
    if (i < 0 || j < 0)                    return false;
    if (i >= nums.length || j >= nums.length) return false;
    if (i === j)                            return false;

    return nums[i] + nums[j] === target;
  }

  // Sort-insensitive comparisons (order doesn't matter)
  const SORT_INSENSITIVE = [
    "groupAnagrams",
    "findAnagrams",
    "permutation",
    "intersect",
    "intersection",
    "findDuplicate",
  ];

  if (
    SORT_INSENSITIVE.some((fn) =>
      functionName.toLowerCase().includes(fn.toLowerCase())
    )
  ) {
    if (Array.isArray(actual) && Array.isArray(expected)) {
      return (
        JSON.stringify([...actual].sort()) ===
        JSON.stringify([...expected].sort())
      );
    }
  }

  // Default deep equality
  return deepEqual(actual, expected);
};

// ===============================
// PARSE STDOUT SAFELY
// ===============================
const parseStdout = (raw) => {
  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch (_) {}

  // Try last JSON-looking line (user code may print extra stuff)
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.startsWith("{") || line.startsWith("[")) {
      try {
        return JSON.parse(line);
      } catch (_) {
        continue;
      }
    }
  }

  return null; // couldn't parse anything
};

// ===============================
// RUN SINGLE TEST CASE
// ===============================
const runSingleTest = async (language, code, functionName, testCase, jobDir) => {
  const config = LANGUAGE_CONFIG[language];
  if (!config) throw new Error(`Unsupported language: ${language}`);

  const fileName = `${uuidv4()}.${config.extension}`;
  const filePath = path.join(jobDir, fileName);
  const start    = Date.now();

  let cmd;
  try {
    cmd = config.run(filePath); // may throw if Python not found
  } catch (err) {
    return {
      input:         testCase.input,
      expected:      testCase.expected,
      actual:        null,
      passed:        false,
      error:         err.message,
      executionTime: 0,
    };
  }

  try {
    // Write runner file
    const runnerCode = buildRunnerCode(language, code, functionName, testCase.input);
    await fs.writeFile(filePath, runnerCode, "utf8");

    // Execute
    const { stdout, stderr } = await execAsync(cmd, {
      timeout:    TIMEOUT,
      maxBuffer:  MAX_BUFFER,
      killSignal: "SIGKILL",
    });

    const executionTime = Date.now() - start;
    const raw = stdout.trim();

    // No output at all
    if (!raw) {
      return {
        input:         testCase.input,
        expected:      testCase.expected,
        actual:        null,
        passed:        false,
        error:         stderr?.trim() || "No output produced",
        executionTime,
      };
    }

    // Parse output
    const parsed = parseStdout(raw);

    if (!parsed) {
      return {
        input:         testCase.input,
        expected:      testCase.expected,
        actual:        raw,
        passed:        false,
        error:         `Could not parse output: ${raw.slice(0, 200)}`,
        executionTime,
      };
    }

    // Runtime error inside user code
    if (parsed.error) {
      return {
        input:         testCase.input,
        expected:      testCase.expected,
        actual:        null,
        passed:        false,
        error:         parsed.error,
        executionTime,
      };
    }

    const actual = parsed.result;
    const passed = smartCompare({
      actual,
      expected: testCase.expected,
      input:    testCase.input,
      functionName,
    });

    return {
      input:    testCase.input,
      expected: testCase.expected,
      actual,
      passed,
      error:         null,
      executionTime,
    };
  } catch (err) {
    const executionTime = Date.now() - start;

    // Time Limit Exceeded
    if (err.killed || err.signal === "SIGKILL" || err.code === "ETIMEDOUT") {
      return {
        input:         testCase.input,
        expected:      testCase.expected,
        actual:        "Time Limit Exceeded",
        passed:        false,
        error:         "Time Limit Exceeded",
        executionTime,
      };
    }

    // Output too large
    if (err.message?.includes("maxBuffer")) {
      return {
        input:         testCase.input,
        expected:      testCase.expected,
        actual:        null,
        passed:        false,
        error:         "Output Limit Exceeded",
        executionTime,
      };
    }

    // Extract useful error from stderr if available
    const errMsg =
      err.stderr?.trim() ||
      err.stdout?.trim() ||
      err.message ||
      "Unknown execution error";

    // Try to parse stderr as JSON (our runner might have written there)
    const parsedErr = parseStdout(errMsg);
    if (parsedErr?.error) {
      return {
        input:         testCase.input,
        expected:      testCase.expected,
        actual:        null,
        passed:        false,
        error:         parsedErr.error,
        executionTime,
      };
    }

    return {
      input:         testCase.input,
      expected:      testCase.expected,
      actual:        null,
      passed:        false,
      error:         errMsg.slice(0, 500), // cap error length
      executionTime,
    };
  } finally {
    // Always clean up temp file
    await fs.unlink(filePath).catch(() => {});
  }
};

// ===============================
// MAIN EXPORT
// ===============================
export const runInDocker = async ({
  language = "javascript",
  code,
  functionName,
  testCases,
}) => {
  // Fast-fail for unsupported languages
  if (!LANGUAGE_CONFIG[language]) {
    throw new Error(
      `Unsupported language: ${language}. Supported: ${Object.keys(LANGUAGE_CONFIG).join(", ")}`
    );
  }

  // Fast-fail for Python if not installed
  if (language === "python" && !PYTHON_BIN) {
    return testCases.map((tc) => ({
      input:         tc.input,
      expected:      tc.expected,
      actual:        null,
      passed:        false,
      error:         "Python is not installed on this server. Contact admin.",
      executionTime: 0,
    }));
  }

  await ensureTempRoot();

  const jobId  = uuidv4();
  const jobDir = path.join(TEMP_DIR, jobId);

  try {
    await fs.mkdir(jobDir, { recursive: true });

    const results = [];

    for (const tc of testCases) {
      const result = await runSingleTest(
        language,
        code,
        functionName,
        tc,
        jobDir
      );
      results.push(result);
    }

    return results;
  } catch (err) {
    console.error("❌ runInDocker error:", err.message);
    throw err;
  } finally {
    await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});
    console.log(`🧹 Cleaned temp: ${jobDir}`);
  }
};
