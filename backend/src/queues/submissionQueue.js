import { Queue } from "bullmq";
import redis from "../config/redis.js";

// This is just the QUEUE — only adds jobs
// The worker that processes jobs is separate
const submissionQueue = new Queue("submissions", {
  connection: redis,
  defaultJobOptions: {
    attempts: 2, // retry once if it fails
    backoff: { type: "fixed", delay: 2000 },
    removeOnComplete: 100, // keep last 100 completed jobs in Redis
    removeOnFail: 200,
  },
});

export default submissionQueue;
