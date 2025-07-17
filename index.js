import chalk from "chalk";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { redis } from "./lib/redis.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 8000;

// Logger middleware
const logger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const method = chalk.green(req.method);
    const url = chalk.blue(req.url);
    const time = chalk.yellow(new Date().toLocaleTimeString());
    const duration = chalk.cyan(`${Date.now() - start}ms`);
    const status = chalk.cyan("🟢 Request");

    console.log(
      `${status} from ${chalk.magenta(
        req.hostname
      )} → ${method} ${url} at ${time} in ${duration}`
    );
  });

  next();
};

// Middlewares
app.use(express.json());
app.use(cors());
app.use(logger);

// Mount Router
app.get("/", (req, res) => {
  res.send("Exploring Redis server is running...");
});

// Normal Cache
app.get("/redis/cache", async (req, res) => {
  const { key: cacheKey, TTL } = req.query;

  if (!cacheKey || !TTL) {
    console.log("⛔ Missing query parameters (key, TTL)");
    return res.status(400).json({
      error: "Please provide 'key' and 'TTL' as query parameters.",
    });
  }

  const ttlSeconds = parseInt(TTL);
  if (isNaN(ttlSeconds) || ttlSeconds <= 0) {
    return res.status(400).json({ error: "'TTL' must be a positive number." });
  }

  console.log(`🔍 Checking Redis cache for key: ${cacheKey}...`);

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log("✅ Cache HIT! Sending cached data...");
      return res.json({ source: "cache", data: cachedData });
    }

    console.log("❌ Cache MISS! Fetching fresh data...");
    const response = await fetch("https://jsonplaceholder.typicode.com/posts");
    const data = await response.json();

    await redis.set(cacheKey, JSON.stringify(data), { ex: ttlSeconds });

    console.log(`💾 Cached data for ${ttlSeconds}s.`);
    res.json({ source: "fresh", data });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: "Failed to fetch and cache data." });
  }
});

// Dynamic Cache
app.get("/dynamic/cache", async (req, res) => {
  const bodyData = req.body;
  const { key, TTL } = req.query;

  // TTL validation
  const ttlSeconds = parseInt(TTL);
  if (isNaN(ttlSeconds) || ttlSeconds <= 0) {
    return res.status(400).json({ error: "'TTL' must be a positive number." });
  }

  try {
    const cachedData = await redis.get(key);
    if (cachedData) {
      return res.json({ source: "cache", data: cachedData });
    }

    await redis.set(key, JSON.stringify(bodyData), { ex: ttlSeconds });

    return res.json({ source: "fresh", data: bodyData });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: "Failed to get and cache data!" });
  }
});

// Invalidate cache
app.post("/invalidate/cache", async (req, res) => {
  const { key } = req.query;

  if (!key) {
    return res
      .status(400)
      .json({ error: "Key is required to invalidate cache!" });
  }

  try {
    const deletedCache = await redis.del(key);

    if (deletedCache) {
      return res.json({
        success: true,
        message: `Cache invalidated for key: ${key}`,
        data: deletedCache
      });
    } else {
      return res
        .status(404)
        .json({ success: false, message: "No such key in cache!" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to invalidate cache!" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Exploring Redis Server is running at port: ${port}`);
});
