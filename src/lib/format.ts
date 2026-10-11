import type { Currency } from "./products";

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  PEN: "S/",
  MXN: "$",
  COP: "$",
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  PEN: "Soles",
  MXN: "Pesos Mexicanos",
  COP: "Pesos Colombianos",
};

export const CURRENCY_FLAGS: Record<Currency, string> = {
  PEN: "🇵🇪",
  MXN: "🇲🇽",
  COP: "🇨🇴",
};

export const CURRENCY_CODES: Record<Currency, string> = {
  PEN: "PEN",
  MXN: "MXN",
  COP: "COP",
};

export function formatCurrency(amount: number, currency: Currency = "PEN"): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const formatted = new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 0,
  }).format(amount);
  if (currency === "PEN") {
    return `${symbol} ${formatted}`;
  }
  return `${symbol}${formatted} ${currency}`;
}

export function formatPriceCompact(amount: number, currency: Currency = "PEN"): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  if (amount >= 1000000) return `${symbol}${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(1)}K`;
  return `${symbol}${amount}`;
}

export function generateOrderCode(): string {
  const num = Math.floor(Math.random() * 99999) + 1;
  return `BF-${num.toString().padStart(5, "0")}`;
}
