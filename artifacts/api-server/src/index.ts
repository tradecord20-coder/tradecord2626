import app from "./app";
import { logger } from "./lib/logger";
import { startWatchdog } from "./lib/watchdog";

// Refactored: Do NOT require PORT at import time.
// This allows Vercel serverless to import the app handler without crashing.

async function startServer(): Promise<void> {
  const rawPort = process.env["PORT"];

  if (!rawPort) {
    logger.warn("PORT environment variable not provided. Skipping local server startup.");
    logger.info("App is ready for serverless execution. Use exports for handler.");
    return;
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
    startWatchdog();
  });
}

// Only start server in local/development context
if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
  startServer().catch((err) => {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  });
}

export { app };
