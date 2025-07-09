import chalk from "chalk";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

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

// Start the server
app.listen(port, () => {
  console.log(`Exploring Redis Server is running at port: ${port}`);
});
