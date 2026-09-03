import { Router, type IRouter } from "express";
import {
  GetChannelsResponse,
  GetDashboardResponse,
  GetPerformanceQueryParams,
  GetPerformanceResponse,
  GetQuotesResponse,
  GetTradesResponse,
  ReceiveWhatsappWebhookBody,
  ReceiveWhatsappWebhookResponse,
  UpdateChannelBody,
  UpdateChannelParams,
  UpdateChannelResponse,
} from "@workspace/api-zod";
import { getQuotes } from "../lib/market-data";
import { getChannels, getDashboard, getPerformance, getTrades, updateChannel } from "../lib/tradecore-db";

const router: IRouter = Router();
const isAlertConfigured = () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
const alertStatus = () => (isAlertConfigured() ? "armed" : "not_configured") as "armed" | "not_configured";

router.get("/dashboard", async (_req, res) => {
  await getQuotes();
  res.json(GetDashboardResponse.parse(getDashboard(alertStatus())));
});

router.get("/quotes", async (_req, res) => {
  res.json(GetQuotesResponse.parse(await getQuotes()));
});

router.get("/channels", (_req, res) => {
  res.json(GetChannelsResponse.parse(getChannels()));
});

router.patch("/channels/:id", (req, res) => {
  const params = UpdateChannelParams.parse(req.params);
  const body = UpdateChannelBody.parse(req.body);
  const channel = updateChannel(params.id, body);
  if (!channel) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }
  res.json(UpdateChannelResponse.parse(channel));
});

router.get("/trades", async (_req, res) => {
  await getQuotes();
  res.json(GetTradesResponse.parse(getTrades()));
});

router.get("/performance", (req, res) => {
  const query = GetPerformanceQueryParams.parse(req.query);
  res.json(GetPerformanceResponse.parse(getPerformance(query.period)));
});

router.post("/webhooks/whatsapp", (req, res) => {
  const payload = ReceiveWhatsappWebhookBody.parse(req.body ?? {});
  const message = String(payload.Body ?? payload.message ?? "").trim().toLowerCase();
  const response =
    message === "1"
      ? "TradeCore received BUY. Execution remains guarded until a live broker connection is explicitly enabled."
      : message === "2"
        ? "TradeCore received SKIP. No order was created."
        : `TradeCore status: ${getTrades().length} active positions, ${alertStatus()} alerts, guarded execution.`;
  res.type("text/plain").send(ReceiveWhatsappWebhookResponse.parse(response));
});

export default router;