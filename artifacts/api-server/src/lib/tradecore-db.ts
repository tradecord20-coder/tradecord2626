import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import crypto from "node:crypto";

export type ChannelRecord = {
  id: string;
  name: string;
  description: string;
  icon: string;
  budget: number;
  active: boolean;
  status: "running" | "paused" | "ready";
  accent: string;
};

export type TradeRecord = {
  id: string;
  asset: string;
  channel: string;
  side: "BUY" | "SELL";
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  status: "watching" | "protected" | "executing" | "closed";
  updatedAt: string;
};

export type TransactionRecord = {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "FEE" | "PAYOUT";
  amount: number;
  balanceAfter: number;
  notes?: string | null;
  createdAt: string;
};

export type TradeHistoryRecord = {
  id: string;
  tradeId: string;
  asset: string;
  side: string;
  size: number;
  entryPrice: number;
  exitPrice: number | null;
  pnl: number | null;
  openedAt: string;
  closedAt: string | null;
};

const databasePath = process.env.TRADECORE_DB_PATH ?? join(process.cwd(), "data", "tradecore.sqlite");
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);

// Performance pragmas
try {
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
} catch (e) {
  // ignore if pragmas not supported
}

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    wallet_balance REAL NOT NULL DEFAULT 10000,
    starting_balance REAL NOT NULL DEFAULT 10000,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    budget REAL NOT NULL,
    active INTEGER NOT NULL DEFAULT 0,
    accent TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    asset TEXT NOT NULL,
    channel TEXT NOT NULL,
    side TEXT NOT NULL,
    size REAL NOT NULL,
    entry_price REAL NOT NULL,
    current_price REAL NOT NULL,
    pnl REAL NOT NULL,
    pnl_percent REAL NOT NULL,
    status TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trade_history (
    id TEXT PRIMARY KEY,
    trade_id TEXT NOT NULL,
    asset TEXT NOT NULL,
    side TEXT NOT NULL,
    size REAL NOT NULL,
    entry_price REAL NOT NULL,
    exit_price REAL,
    pnl REAL,
    opened_at TEXT NOT NULL,
    closed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    balance_after REAL NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pilots_state (
    pilot_id TEXT PRIMARY KEY,
    state TEXT NOT NULL,
    meta TEXT,
    updated_at TEXT NOT NULL
  );
`);

// Seed channels if empty
const seedChannels = [
  ["crypto", "Crypto", "Diversified altcoin exposure", "layers", 2500, 1, "#b9ef57"],
  ["bitcoin", "Bitcoin", "Core BTC directional strategy", "bot", 4000, 1, "#f3b54a"],
  ["indian-stocks", "Indian Stocks", "Jio / Airtel watchlist", "chart", 2000, 0, "#68d6d1"],
  ["micro-trades", "Micro-Trades", "Small, frequent opportunities", "bolt", 500, 0, "#b58cff"],
];

const countChannels = db.prepare("SELECT COUNT(*) AS c FROM channels").get() as { c: number };
if (countChannels.c === 0) {
  const insert = db.prepare("INSERT INTO channels (id, name, description, icon, budget, active, accent) VALUES (?, ?, ?, ?, ?, ?, ?)");
  for (const row of seedChannels) insert.run(...row);
}

const countSettings = db.prepare("SELECT COUNT(*) AS c FROM settings").get() as { c: number };
if (countSettings.c === 0) {
  db.prepare("INSERT INTO settings (id, wallet_balance, starting_balance) VALUES (1, ?, ?)").run(10000, 10000);
}

// Utilities
function nowISO() {
  return new Date().toISOString();
}
function uid(prefix = "") {
  return prefix + crypto.randomBytes(10).toString("hex");
}

// Channels
export function getChannels(): ChannelRecord[] {
  const rows = db.prepare("SELECT * FROM channels ORDER BY rowid").all() as any[];
  return rows.map((r) => {
    const active = Number(r.active) === 1;
    return {
      id: String(r.id),
      name: String(r.name),
      description: String(r.description),
      icon: String(r.icon),
      budget: Number(r.budget),
      active,
      status: active ? "running" : Number(r.budget) > 0 ? "ready" : "paused",
      accent: String(r.accent),
    } as ChannelRecord;
  });
}

export function updateChannel(id: string, update: { budget?: number; active?: boolean }): ChannelRecord | null {
  const existing = db.prepare("SELECT * FROM channels WHERE id = ?").get(id);
  if (!existing) return null;
  const budget = update.budget === undefined ? Number(existing.budget) : Math.max(0, update.budget);
  const active = update.active === undefined ? Number(existing.active) === 1 : update.active;
  db.prepare("UPDATE channels SET budget = ?, active = ? WHERE id = ?").run(budget, active ? 1 : 0, id);
  return getChannels().find((c) => c.id === id) ?? null;
}

// Wallet & transactions
export function getWalletBalance(): number {
  const r = db.prepare("SELECT wallet_balance FROM settings WHERE id = 1").get() as { wallet_balance: number } | undefined;
  return Number(r?.wallet_balance ?? 0);
}

export function deposit(amount: number, notes?: string): TransactionRecord {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid deposit amount");
  const current = getWalletBalance();
  const newBalance = Math.round((current + amount) * 100) / 100;
  const id = uid("tx_");
  const now = nowISO();
  const insert = db.prepare("INSERT INTO transactions (id, type, amount, balance_after, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)");
  const update = db.prepare("UPDATE settings SET wallet_balance = ? WHERE id = 1");
  const tx = db.transaction(() => {
    insert.run(id, "DEPOSIT", amount, newBalance, notes ?? null, now);
    update.run(newBalance);
  });
  tx();
  return { id, type: "DEPOSIT", amount, balanceAfter: newBalance, notes: notes ?? null, createdAt: now };
}

export function withdraw(amount: number, notes?: string): TransactionRecord {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid withdrawal amount");
  const current = getWalletBalance();
  if (amount > current) throw new Error("Insufficient funds");
  const newBalance = Math.round((current - amount) * 100) / 100;
  const id = uid("tx_");
  const now = nowISO();
  const insert = db.prepare("INSERT INTO transactions (id, type, amount, balance_after, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)");
  const update = db.prepare("UPDATE settings SET wallet_balance = ? WHERE id = 1");
  const tx = db.transaction(() => {
    insert.run(id, "WITHDRAWAL", -Math.abs(amount), newBalance, notes ?? null, now);
    update.run(newBalance);
  });
  tx();
  return { id, type: "WITHDRAWAL", amount: -Math.abs(amount), balanceAfter: newBalance, notes: notes ?? null, createdAt: now };
}

export function getTransactions(limit = 100): TransactionRecord[] {
  return db
    .prepare("SELECT id, type, amount, balance_after as balanceAfter, notes, created_at as createdAt FROM transactions ORDER BY created_at DESC LIMIT ?")
    .all(limit) as TransactionRecord[];
}

// Trades
export function getTrades(): TradeRecord[] {
  const rows = db.prepare("SELECT * FROM trades ORDER BY rowid").all() as any[];
  return rows.map((r) => ({
    id: String(r.id),
    asset: String(r.asset),
    channel: String(r.channel),
    side: r.side === "SELL" ? "SELL" : "BUY",
    size: Number(r.size),
    entryPrice: Number(r.entry_price),
    currentPrice: Number(r.current_price),
    pnl: Number(r.pnl),
    pnlPercent: Number(r.pnl_percent),
    status: String(r.status) as any,
    updatedAt: String(r.updated_at),
  }));
}

export function createSimulatedTrade(params: { asset: string; channel: string; side: "BUY" | "SELL"; size: number; entryPrice: number }): TradeRecord {
  const id = uid("trade_");
  const now = nowISO();
  const pnl = 0;
  const pnl_percent = 0;
  db.prepare(
    "INSERT INTO trades (id, asset, channel, side, size, entry_price, current_price, pnl, pnl_percent, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(id, params.asset, params.channel, params.side, params.size, params.entryPrice, params.entryPrice, pnl, pnl_percent, "executing", now);
  return getTrades().find((t) => t.id === id)!;
}

export function closeTrade(tradeId: string, exitPrice: number): TradeHistoryRecord | null {
  const t = db.prepare("SELECT * FROM trades WHERE id = ?").get(tradeId);
  if (!t) return null;
  const side = t.side === "SELL" ? -1 : 1;
  const pnlPercent = ((exitPrice - Number(t.entry_price)) / Number(t.entry_price)) * 100 * side;
  const channelRow = db.prepare("SELECT budget FROM channels WHERE name = ? OR id = ?").get(t.channel, t.channel);
  const notional = Number(channelRow?.budget ?? 0);
  const pnl = Math.round((notional * pnlPercent / 100) * 100) / 100;
  const now = nowISO();
  const historyId = uid("hist_");
  const insertHistory = db.prepare(
    "INSERT INTO trade_history (id, trade_id, asset, side, size, entry_price, exit_price, pnl, opened_at, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const del = db.prepare("DELETE FROM trades WHERE id = ?");
  const tx = db.transaction(() => {
    insertHistory.run(historyId, tradeId, t.asset, t.side, t.size, t.entry_price, exitPrice, pnl, t.updated_at, now);
    del.run(tradeId);
    // update wallet with pnl (simulate profit/loss transfer to wallet)
    const currentBalance = getWalletBalance();
    const newBalance = Math.round((currentBalance + pnl) * 100) / 100;
    db.prepare("UPDATE settings SET wallet_balance = ? WHERE id = 1").run(newBalance);
    // record transaction
    db
      .prepare("INSERT INTO transactions (id, type, amount, balance_after, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(uid("tx_"), pnl >= 0 ? "PAYOUT" : "FEE", pnl, newBalance, `trade_close:${tradeId}`, now);
  });
  tx();
  return {
    id: historyId,
    tradeId,
    asset: t.asset,
    side: t.side,
    size: t.size,
    entryPrice: Number(t.entry_price),
    exitPrice,
    pnl,
    openedAt: t.updated_at,
    closedAt: now,
  };
}

export function updateTradeMark(asset: string, currentPrice: number): void {
  if (!Number.isFinite(currentPrice)) return;
  const trade = db.prepare("SELECT * FROM trades WHERE asset = ? OR asset LIKE ?").get(asset, `${asset}%`);
  if (!trade) return;
  const entry = Number(trade.entry_price);
  const side = trade.side === "SELL" ? -1 : 1;
  const pnlPercent = entry === 0 ? 0 : ((currentPrice - entry) / entry) * 100 * side;
  const channel = db.prepare("SELECT budget FROM channels WHERE name = ? OR id = ?").get(String(trade.channel), String(trade.channel));
  const notional = Number(channel?.budget ?? 0);
  const pnl = Math.round((notional * pnlPercent / 100) * 100) / 100;
  db.prepare("UPDATE trades SET current_price = ?, pnl = ?, pnl_percent = ?, updated_at = ? WHERE id = ?").run(
    currentPrice,
    pnl,
    pnlPercent,
    new Date().toISOString(),
    trade.id,
  );
}

// Dashboard & Performance
export function getDashboard(alertStatus: "armed" | "paused" | "not_configured") {
  const trades = getTrades();
  const pnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const wallet = getWalletBalance();
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
  const points = [
    { label: "Mon", value: 0.22, wins: 4, trades: 5 },
    { label: "Tue", value: 0.46, wins: 5, trades: 6 },
    { label: "Wed", value: 0.32, wins: 3, trades: 4 },
    { label: "Thu", value: 0.88, wins: 6, trades: 7 },
    { label: "Fri", value: 1.14, wins: 5, trades: 6 },
  ];
  const totalTrades = points.reduce((s, p) => s + p.trades, 0);
  const wins = points.reduce((s, p) => s + p.wins, 0);
  return {
    period,
    winRate: totalTrades ? Math.round((wins / totalTrades) * 10000) / 100 : 0,
    totalReturn: points.at(-1)?.value ?? 0,
    totalTrades,
    points,
  };
}

// Pilot state
export function setPilotState(pilotId: string, state: string, meta?: Record<string, unknown>) {
  const now = nowISO();
  db.prepare("INSERT OR REPLACE INTO pilots_state (pilot_id, state, meta, updated_at) VALUES (?, ?, ?, ?)").run(pilotId, state, meta ? JSON.stringify(meta) : null, now);
}
export function getPilotState(pilotId: string) {
  const r = db.prepare("SELECT pilot_id as pilotId, state, meta, updated_at as updatedAt FROM pilots_state WHERE pilot_id = ?").get(pilotId);
  if (!r) return null;
  return { pilotId: r.pilotId, state: r.state, meta: r.meta ? JSON.parse(r.meta) : null, updatedAt: r.updatedAt };
}

export default {
  getChannels,
  updateChannel,
  getTrades,
  createSimulatedTrade,
  closeTrade,
  updateTradeMark,
  getDashboard,
  getPerformance,
  deposit,
  withdraw,
  getWalletBalance,
  getTransactions,
  setPilotState,
  getPilotState,
};
