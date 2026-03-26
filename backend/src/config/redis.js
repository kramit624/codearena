import { Redis } from "ioredis";

const redisConfig = process.env.REDIS_URL
  ? // Production — Upstash uses TLS URL
    process.env.REDIS_URL
  : // Local — host/port
    {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: null,
    };

const redis = new Redis(redisConfig, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false, // required for Upstash
});

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err.message));

export default redis;
