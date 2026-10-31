export interface PaymentMethod {
  id: string;
  name: string;
  accountHolder?: string;
  accountNumber?: string;
  imageData?: string;
  imageUrl?: string;
  currency?: string;
  enabled?: boolean;
}

const STORAGE_KEY = "blox-payment-methods";

const API_ENDPOINTS = [
  "/admin/api/payment-methods",
  "http://localhost:3001/admin/api/payment-methods",
  "http://localhost:3000/api/payment-methods",
];

export function generatePaymentMethodId(): string {
  return `pm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function readStoredPaymentMethods(): PaymentMethod[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as PaymentMethod[]) : [];
  } catch {
    return [];
  }
}

export function writeStoredPaymentMethods(methods: PaymentMethod[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(methods));
  } catch {
    // ignore
  }
}

export async function fetchRemotePaymentMethods(): Promise<PaymentMethod[] | null> {
  for (const ep of API_ENDPOINTS) {
    try {
      const res = await fetch(ep, { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.methods)) return data.methods as PaymentMethod[];
      }
    } catch {
      // probar siguiente
    }
  }
  return null;
}

export async function saveRemotePaymentMethods(methods: PaymentMethod[]): Promise<boolean> {
  for (const ep of API_ENDPOINTS) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methods }),
      });
      if (res.ok) return true;
    } catch {
      // probar siguiente
    }
  }
  return false;
}
