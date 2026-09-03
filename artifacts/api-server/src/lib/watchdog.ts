import { logger } from "./logger";
import { getQuotes } from "./market-data";
import { getTrades } from "./tradecore-db";

const controlNumber = process.env.TRADECORE_CONTROL_NUMBER ?? "+919050093930";
const warningThreshold = Number(process.env.TRADECORE_WARNING_THRESHOLD_PCT ?? "0.15");
let lastAlertByTrade = new Map<string, number>();
let lastNoticeByTrade = new Map<string, number>();

async function sendWhatsAppAlert(message: string, dedupeKey: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!accountSid || !authToken || !from) {
    const lastNotice = lastNoticeByTrade.get(dedupeKey) ?? 0;
    if (Date.now() - lastNotice >= 15 * 60 * 1000) {
      logger.warn({ controlNumber }, "Watchdog alert not sent: WhatsApp provider is not configured");
      lastNoticeByTrade.set(dedupeKey, Date.now());
    }
    return false;
  }
  const body = new URLSearchParams({
    To: `whatsapp:${controlNumber}`,
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    Body: message,
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error(`Twilio returned ${response.status}`);
  return true;
}

export async function runWatchdog(): Promise<void> {
  try {
    await getQuotes();
    const now = Date.now();
    for (const trade of getTrades()) {
      if (trade.pnlPercent > warningThreshold) continue;
      const lastAlert = lastAlertByTrade.get(trade.id) ?? 0;
      if (now - lastAlert < 15 * 60 * 1000) continue;
      const sent = await sendWhatsAppAlert(
        `TradeCore safety watch: ${trade.asset} is at ${trade.pnlPercent.toFixed(2)}% P&L. Reply 1 to review BUY guidance or 2 to skip. No order is placed automatically.`,
        trade.id,
      );
      if (sent) lastAlertByTrade.set(trade.id, now);
      logger.warn({ tradeId: trade.id, asset: trade.asset, pnlPercent: trade.pnlPercent, sent }, "Watchdog evaluated trade");
    }
  } catch (error) {
    logger.error({ err: error }, "Watchdog cycle failed");
  }
}

export function startWatchdog(): NodeJS.Timeout {
  const interval = setInterval(() => void runWatchdog(), 30_000);
  interval.unref();
  void runWatchdog();
  return interval;
}