import { parentPort, workerData } from "worker_threads";

const { code, functionName, input } = workerData;

try {
  const wrappedCode = `
    ${code}
    return ${functionName}(...${JSON.stringify(input)});
  `;

  const fn = new Function(wrappedCode);

  const result = fn();

  parentPort.postMessage({ result });
} catch (err) {
  parentPort.postMessage({ error: err.message });
}
