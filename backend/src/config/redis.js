import { Redis } from "ioredis";

/*
 Note: Upstash (serverless Redis) closes idle connections which leads to
 repeated ECONNRESET/EPIPE logs when used with long-lived Redis clients
 like ioredis/BullMQ. For production with BullMQ consider using a
 persistent Redis (self-hosted or managed) or use Upstash REST API for
 short-lived operations. The options below tune reconnection behavior
 to reduce noise but don't eliminate Upstash connection semantics.
*/

const isUpstash = !!process.env.REDIS_URL && process.env.REDIS_URL.includes("upstash");

let redisOptions = {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false, // Upstash doesn't like READY checks
  // tune the retry/backoff behavior to avoid tight reconnect loops
  retryStrategy: (times) => Math.min(2000, times * 50),
  // try to reconnect automatically on common transient errors
  reconnectOnError: (err) => {
    if (!err || !err.message) return false;
    return /READONLY|ETIMEDOUT|ECONNRESET|EPIPE|ENOTFOUND/.test(err.message);
  },
  // keepAlive to reduce idle socket closes in some environments
  keepAlive: 10000,
  // Helpful name for debugging on Redis side
  connectionName: process.env.REDIS_CONNECTION_NAME || "codearena-app",
};

// If using Upstash TLS URL (production), pass the URL string and allow TLS
const redisClientConfig = isUpstash
  ? process.env.REDIS_URL
  : {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT) || 6379,
    };

// When connecting to Upstash over TLS, ioredis will derive TLS from the URL.
// For non-Upstash (local) we won't set tls.
// If using Upstash ensure TLS is enabled in options (some environments need explicit tls)
const finalOptions = { ...redisOptions };
if (isUpstash) finalOptions.tls = finalOptions.tls || {};

const redis = new Redis(redisClientConfig, finalOptions);

// Extra logging for debugging connection lifecycle in Render/Upstash env
redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("ready", () => console.log("🔵 Redis ready"));
redis.on("close", () => console.warn("⚪ Redis connection closed"));
redis.on("end", () => console.warn("⚪ Redis connection ended"));
redis.on("reconnecting", (delay) => console.log(`🔁 Redis reconnecting in ${delay}ms`));
redis.on("error", (err) => {
  // Suppress noisy, expected transient errors to reduce log spam
  if (err && (err.code === "ECONNRESET" || err.code === "EPIPE")) {
    // Optional: uncomment to log reduced-level trace
    // console.debug("Redis transient error:", err.code);
    return;
  }

  console.error("❌ Redis error:", err && err.message ? err.message : err);
});

/*
 Example: create separate Redis connections for BullMQ queue and worker
 (recommended instead of reusing this shared client):

 import { Queue } from 'bullmq';
 const queueConnection = new Redis(process.env.REDIS_URL, {}); // add options as needed
 const submissionQueue = new Queue('submissions', { connection: queueConnection });

 This keeps queue connections isolated and reduces interference with short-lived
 app connections on serverless platforms.
*/

export default redis;
