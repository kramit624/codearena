import { Worker } from "worker_threads";
import path from "path";

export const runCode = async ({ code, functionName, testCases }) => {
  const results = [];

  // smart validator
  const isEqual = (output, expected, input, functionName) => {
    if (functionName === "twoSum") {
      const nums = input[0];
      const target = input[1];

      if (!Array.isArray(output) || output.length !== 2) return false;

      const [i, j] = output;

      return nums[i] + nums[j] === target;
    }

    return JSON.stringify(output) === JSON.stringify(expected);
  };

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];

    try {
      // 🔥 IMPORTANT FIX: return must be inside function
      const wrappedCode = `
        ${code}
        return ${functionName}(...${JSON.stringify(tc.input)});
      `;

      const fn = new Function(wrappedCode);

      const runWorker = (code, functionName, input, timeout = 1000) => {
        return new Promise((resolve, reject) => {
          const worker = new Worker(path.resolve("./src/utils/worker.js"), {
            workerData: { code, functionName, input },
          });

          const timer = setTimeout(() => {
            worker.terminate();
            reject(new Error("Time Limit Exceeded"));
          }, timeout);

          worker.on("message", (msg) => {
            clearTimeout(timer);
            if (msg.error) reject(new Error(msg.error));
            else resolve(msg.result);
          });

          worker.on("error", (err) => {
            clearTimeout(timer);
            reject(err);
          });

          worker.on("exit", (code) => {
            if (code !== 0) {
              reject(new Error("Worker stopped unexpectedly"));
            }
          });
        });
      };

      const output = await runWorker(code, functionName, tc.input); // ✅ output defined here

      const passed = isEqual(output, tc.expected, tc.input, functionName);

      results.push({
        input: tc.input,
        expected: tc.expected,
        output,
        passed,
      });
    } catch (error) {
      results.push({
        input: tc.input,
        expected: tc.expected,
        output: error.message,
        passed: false,
      });
    }
  }

  return results;
};
