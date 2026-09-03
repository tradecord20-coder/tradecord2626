import { updateTradeMark } from "./tradecore-db";

type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  source: string;
  updatedAt: string;
};

let cachedQuotes: Quote[] = [
  { symbol: "BTC", name: "Bitcoin", price: 9251800, change: 37300, changePercent: 0.4, currency: "INR", source: "seed", updatedAt: new Date().toISOString() },
  { symbol: "ETH", name: "Ethereum", price: 316420, change: 3620, changePercent: 1.16, currency: "INR", source: "seed", updatedAt: new Date().toISOString() },
  { symbol: "SOL", name: "Solana", price: 14420, change: -118, changePercent: -0.81, currency: "INR", source: "seed", updatedAt: new Date().toISOString() },
  { symbol: "JIO", name: "Reliance / Jio", price: 1318.2, change: 6.4, changePercent: 0.49, currency: "INR", source: "seed", updatedAt: new Date().toISOString() },
  { symbol: "AIRTEL", name: "Bharti Airtel", price: 1851.9, change: 9.7, changePercent: 0.53, currency: "INR", source: "seed", updatedAt: new Date().toISOString() },
];

const number = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "TradeCore/1.0" }, signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`Market provider returned ${response.status}`);
  return response.json();
}

async function fetchCrypto(): Promise<Quote[]> {
  const data = (await fetchJson("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=inr&include_24hr_change=true")) as Record<string, Record<string, unknown>>;
  const now = new Date().toISOString();
  return [
    ["BTC", "Bitcoin", "bitcoin"],
    ["ETH", "Ethereum", "ethereum"],
    ["SOL", "Solana", "solana"],
  ].flatMap(([symbol, name, id]) => {
    const row = data[id];
    const price = number(row?.inr);
    const changePercent = number(row?.inr_24h_change);
    if (price === null || changePercent === null) return [];
    return [{ symbol, name, price, change: price * changePercent / 100, changePercent, currency: "INR", source: "CoinGecko", updatedAt: now }];
  });
}

async function fetchStock(symbol: string, label: string, yahooSymbol: string): Promise<Quote | null> {
  const data = (await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?range=1d&interval=1m`)) as { chart?: { result?: Array<{ meta?: Record<string, unknown> }> } };
  const meta = data.chart?.result?.[0]?.meta;
  const price = number(meta?.regularMarketPrice);
  const previousClose = number(meta?.previousClose);
  if (price === null || previousClose === null || previousClose === 0) return null;
  const change = price - previousClose;
  return { symbol, name: label, price, change, changePercent: change / previousClose * 100, currency: "INR", source: "Yahoo Finance", updatedAt: new Date().toISOString() };
}

export async function getQuotes(): Promise<Quote[]> {
  const previous = cachedQuotes;
  try {
    const [crypto, jio, airtel] = await Promise.all([
      fetchCrypto(),
      fetchStock("JIO", "Reliance / Jio", "RELIANCE.NS"),
      fetchStock("AIRTEL", "Bharti Airtel", "BHARTIARTL.NS"),
    ]);
    const fetched = [...crypto, ...(jio ? [jio] : []), ...(airtel ? [airtel] : [])];
    if (fetched.length >= 3) cachedQuotes = fetched;
  } catch {
    cachedQuotes = previous.map((quote) => ({ ...quote, source: quote.source === "seed" ? "cached" : `${quote.source} cache` }));
  }
  for (const quote of cachedQuotes) updateTradeMark(quote.symbol === "BTC" ? "BTC / INR" : quote.symbol === "ETH" ? "ETH / INR" : quote.symbol === "AIRTEL" ? "BHARTIARTL" : quote.symbol, quote.price);
  return cachedQuotes;
}