import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type ChannelStatus = "running" | "paused" | "ready";
export type TradeStatus = "watching" | "protected" | "executing";

export type ChannelRecord = {
  id: string;
  name: string;
  description: string;
  icon: string;
  budget: number;
  active: boolean;
  status: ChannelStatus;
  accent: string;
};

export type TradeRecord = {
  id: string;
  asset: string;
  channel: string;
  side: "BUY" | "SELL";
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  status: TradeStatus;
  updatedAt: string;
};

export type PerformancePoint = {
  label: string;
  value: number;
  wins: number;
  trades: number;
};

const databasePath =
  process.env.TRADECORE_DB_PATH ??
  join(process.cwd(), "data", "tradecore.sqlite");

mkdirSync(dirname(databasePath), { recursive: true });
export const database = new DatabaseSync(databasePath);

database.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS tradecore_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    wallet_balance REAL NOT NULL DEFAULT 10000,
    starting_balance REAL NOT NULL DEFAULT 10000,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS tradecore_channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    budget REAL NOT NULL,
    active INTEGER NOT NULL DEFAULT 0,
    accent TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tradecore_trades (
    id TEXT PRIMARY KEY,
    asset TEXT NOT NULL,
    channel TEXT NOT NULL,
    side TEXT NOT NULL,
    entry_price REAL NOT NULL,
    current_price REAL NOT NULL,
    pnl REAL NOT NULL,
    pnl_percent REAL NOT NULL,
    status TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tradecore_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period TEXT NOT NULL,
    label TEXT NOT NULL,
    value REAL NOT NULL,
    wins INTEGER NOT NULL,
    trades INTEGER NOT NULL
  );
`);

const channelSeed = [
  ["crypto", "Crypto", "Diversified altcoin exposure", "layers", 2500, 1, "#b9ef57"],
  ["bitcoin", "Bitcoin", "Core BTC directional strategy", "bot", 4000, 1, "#f3b54a"],
  ["indian-stocks", "Indian Stocks", "Jio / Airtel watchlist", "chart", 2000, 0, "#68d6d1"],
  ["micro-trades", "Micro-Trades", "Small, frequent opportunities", "bolt", 500, 0, "#b58cff"],
];

if ((database.prepare("SELECT COUNT(*) AS count FROM tradecore_settings").get() as { count: number }).count === 0) {
  database
    .prepare("INSERT INTO tradecore_settings (id, wallet_balance, starting_balance) VALUES (1, ?, ?)")
    .run(10000, 10000);
}

if ((database.prepare("SELECT COUNT(*) AS count FROM tradecore_channels").get() as { count: number }).count === 0) {
  const insert = database.prepare(
    "INSERT INTO tradecore_channels (id, name, description, icon, budget, active, accent) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  for (const row of channelSeed) insert.run(...row);
}

if ((database.prepare("SELECT COUNT(*) AS count FROM tradecore_trades").get() as { count: number }).count === 0) {
  const now = new Date().toISOString();
  const insert = database.prepare(
    "INSERT INTO tradecore_trades (id, asset, channel, side, entry_price, current_price, pnl, pnl_percent, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  insert.run("btc-core", "BTC / INR", "Bitcoin", "BUY", 9214500, 9251800, 373, 0.4, "protected", now);
  insert.run("eth-swing", "ETH / INR", "Crypto", "BUY", 312800, 316420, 362, 1.16, "watching", now);
  insert.run("airtel-watch", "BHARTIARTL", "Indian Stocks", "BUY", 1842.2, 1851.9, 97, 0.53, "watching", now);
}

if ((database.prepare("SELECT COUNT(*) AS count FROM tradecore_performance").get() as { count: number }).count === 0) {
  const points: Array<[string, string, number, number, number]> = [
    ["week", "Mon", 0.22, 4, 5],
    ["week", "Tue", 0.46, 5, 6],
    ["week", "Wed", 0.32, 3, 4],
    ["week", "Thu", 0.88, 6, 7],
    ["week", "Fri", 1.14, 5, 6],
    ["week", "Sat", 1.06, 4, 5],
    ["week", "Sun", 1.32, 3, 4],
    ["fifteen_days", "D-14", -0.18, 3, 5],
    ["fifteen_days", "D-10", 0.35, 4, 6],
    ["fifteen_days", "D-6", 0.82, 5, 6],
    ["fifteen_days", "D-2", 1.18, 6, 7],
    ["fifteen_days", "Today", 1.41, 4, 5],
    ["month", "W1", 0.18, 11, 14],
    ["month", "W2", 0.94, 13, 16],
    ["month", "W3", 1.72, 15, 18],
    ["month", "W4", 2.48, 14, 17],
    ["year", "Jan", 0.6, 28, 36],
    ["year", "Mar", 1.4, 31, 40],
    ["year", "May", 2.2, 37, 46],
    ["year", "Jul", 3.4, 39, 48],
    ["year", "Sep", 4.1, 42, 51],
    ["year", "Nov", 5.3, 47, 56],
  ];
  const insert = database.prepare(
    "INSERT INTO tradecore_performance (period, label, value, wins, trades) VALUES (?, ?, ?, ?, ?)",
  );
  for (const row of points) insert.run(...row);
}

function channelFromRow(row: Record<string, unknown>): ChannelRecord {
  const active = Number(row.active) === 1;
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    icon: String(row.icon),
    budget: Number(row.budget),
    active,
    status: active ? "running" : Number(row.budget) > 0 ? "ready" : "paused",
    accent: String(row.accent),
  };
}

function tradeFromRow(row: Record<string, unknown>): TradeRecord {
  return {
    id: String(row.id),
    asset: String(row.asset),
    channel: String(row.channel),
    side: row.side === "SELL" ? "SELL" : "BUY",
    entryPrice: Number(row.entry_price),
    currentPrice: Number(row.current_price),
    pnl: Number(row.pnl),
    pnlPercent: Number(row.pnl_percent),
    status: row.status === "executing" || row.status === "watching" ? row.status : "protected",
    updatedAt: String(row.updated_at),
  };
}

export function getChannels(): ChannelRecord[] {
  return (database.prepare("SELECT * FROM tradecore_channels ORDER BY rowid").all() as Record<string, unknown>[]).map(channelFromRow);
}

export function updateChannel(id: string, update: { budget?: number; active?: boolean }): ChannelRecord | null {
  const existing = database.prepare("SELECT * FROM tradecore_channels WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!existing) return null;
  const budget = update.budget === undefined ? Number(existing.budget) : Math.max(0, update.budget);
  const active = update.active === undefined ? Number(existing.active) === 1 : update.active;
  database.prepare("UPDATE tradecore_channels SET budget = ?, active = ? WHERE id = ?").run(budget, active ? 1 : 0, id);
  return getChannels().find((channel) => channel.id === id) ?? null;
}

export function getTrades(): TradeRecord[] {
  return (database.prepare("SELECT * FROM tradecore_trades ORDER BY rowid").all() as Record<string, unknown>[]).map(tradeFromRow);
}

export function updateTradeMark(asset: string, currentPrice: number): void {
  const trade = database.prepare("SELECT * FROM tradecore_trades WHERE asset = ?").get(asset) as Record<string, unknown> | undefined;
  if (!trade || !Number.isFinite(currentPrice)) return;
  const entry = Number(trade.entry_price);
  const side = trade.side === "SELL" ? -1 : 1;
  const pnlPercent = ((currentPrice - entry) / entry) * 100 * side;
  const channel = database.prepare("SELECT budget FROM tradecore_channels WHERE name = ?").get(String(trade.channel)) as { budget?: number } | undefined;
  const notional = Number(channel?.budget ?? 0);
  const pnl = Math.round((notional * pnlPercent / 100) * 100) / 100;
  database
    .prepare("UPDATE tradecore_trades SET current_price = ?, pnl = ?, pnl_percent = ?, updated_at = ? WHERE asset = ?")
    .run(currentPrice, pnl, pnlPercent, new Date().toISOString(), asset);
}

export function getDashboard(alertStatus: "armed" | "paused" | "not_configured") {
  const trades = getTrades();
  const pnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const wallet = Number((database.prepare("SELECT wallet_balance FROM tradecore_settings WHERE id = 1").get() as { wallet_balance: number }).wallet_balance);
  const performance = getPerformance("week");
  return {
    walletBalance: Math.round((wallet + pnl) * 100) / 100,
    dayPnl: Math.round(pnl * 100) / 100,
    dayPnlPercent: wallet ? Math.round((pnl / wallet) * 10000) / 100 : 0,
    activeTrades: trades.length,
    winRate: performance.winRate,
    lastUpdated: new Date().toISOString(),
    alertStatus,
  };
}

export function getPerformance(period: "week" | "fifteen_days" | "month" | "year") {
  const points = (database
    .prepare("SELECT label, value, wins, trades FROM tradecore_performance WHERE period = ? ORDER BY id")
    .all(period) as Record<string, unknown>[]).map((row) => ({
    label: String(row.label),
    value: Number(row.value),
    wins: Number(row.wins),
    trades: Number(row.trades),
  })) as PerformancePoint[];
  const totalTrades = points.reduce((sum, point) => sum + point.trades, 0);
  const wins = points.reduce((sum, point) => sum + point.wins, 0);
  return {
    period,
    winRate: totalTrades ? Math.round((wins / totalTrades) * 10000) / 100 : 0,
    totalReturn: points.at(-1)?.value ?? 0,
    totalTrades,
    points,
  };
}