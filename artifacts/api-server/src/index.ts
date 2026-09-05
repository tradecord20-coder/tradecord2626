import app from "./app";
import { logger } from "./lib/logger";
import { startWatchdog } from "./lib/watchdog";

// Vercel serverless integration and local startup handler
async function startServer(): Promise<void> {
  const rawPort = process.env["PORT"] || "3000";
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  app.listen(port, () => {
    logger.info({ port }, "TradeCore Backend Server successfully listening on port");
    try {
      startWatchdog();
    } catch (watchdogErr) {
      logger.error({ watchdogErr }, "Watchdog failed to initialize softly");
    }
  });
}

// Global serverless trigger for Vercel and local environment synchronization
if (process.env.VERCEL === "1") {
  logger.info("TradeCore Production Engine active on Vercel Serverless Gateway.");
  try {
    startWatchdog();
  } catch (e) {
    logger.error("Vercel background tasks initialized safely.");
  }
} else {
  // Local or developer machine backup trigger
  startServer().catch((err) => {
    logger.error({ err }, "Failed to start local development server");
    process.exit(1);
  });
}

export default app;
export { app };
