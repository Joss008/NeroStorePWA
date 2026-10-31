import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";
import type { Product } from "@/lib/products";

const FAST_TIMEOUT_MS = 6000;

let client: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variable");
    }
    const timeoutFetch: typeof fetch = (input, init) =>
      fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(FAST_TIMEOUT_MS) });
    client = createClient(url, key, {
      auth: { persistSession: false },
      global: { fetch: timeoutFetch },
    });
  }
  return client;
}

export interface CatalogState {
  custom: Product[];
  hidden: string[];
  updatedAt: number;
}

export async function getCatalogState(): Promise<CatalogState> {
  const { data, error } = await getSupabase()
    .from("catalog_state")
    .select("custom, hidden, updated_at")
    .eq("id", "main")
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Supabase getCatalogState:", error.message);
    return { custom: [], hidden: [], updatedAt: 0 };
  }

  return {
    custom: Array.isArray(data.custom) ? (data.custom as Product[]) : [],
    hidden: Array.isArray(data.hidden) ? (data.hidden as string[]) : [],
    updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : 0,
  };
}

export async function setCatalogState(custom: Product[], hidden: string[]): Promise<CatalogState> {
  const payload = {
    id: "main",
    custom,
    hidden,
    updated_at: new Date().toISOString(),
  };

  const { error } = await getSupabase().from("catalog_state").upsert(payload);
  if (error) throw new Error(`Supabase setCatalogState: ${error.message}`);

  return { custom, hidden, updatedAt: new Date(payload.updated_at).getTime() };
}

export interface OrderRecord {
  code: string;
  data: Record<string, unknown>;
  status: string;
}

export async function listOrders(): Promise<Record<string, unknown>[]> {
  const { data, error } = await getSupabase()
    .from("orders")
    .select("data, status")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase listOrders:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({ ...(row.data as Record<string, unknown>), status: row.status }));
}

export async function insertOrder(order: Record<string, unknown>): Promise<void> {
  const { error } = await getSupabase()
    .from("orders")
    .upsert({
      code: String(order.code),
      data: order,
      status: String(order.status || "pending"),
      created_at: String(order.createdAt || new Date().toISOString()),
    });

  if (error) throw new Error(`Supabase insertOrder: ${error.message}`);
}

export async function updateOrderStatus(code: string, status: string): Promise<Record<string, unknown> | null> {
  const sb = getSupabase();
  const { data, error } = await sb.from("orders").select("data").eq("code", code).maybeSingle();
  if (error) throw new Error(`Supabase updateOrderStatus: ${error.message}`);
  if (!data) return null;

  const updated = { ...(data.data as Record<string, unknown>), status };
  const { error: updErr } = await sb.from("orders").update({ status, data: updated }).eq("code", code);
  if (updErr) throw new Error(`Supabase updateOrderStatus: ${updErr.message}`);

  return updated;
}

export interface PaymentMethodRecord {
  id: string;
  name: string;
  accountHolder?: string;
  accountNumber?: string;
  imageData?: string;
  imageUrl?: string;
  currency?: string;
  enabled?: boolean;
}

export interface PaymentMethodsState {
  methods: PaymentMethodRecord[];
  updatedAt: number;
}

const PAYMENT_METHODS_FILE = path.join(process.cwd(), "payment-methods.json");

async function readPaymentMethodsFile(): Promise<PaymentMethodsState> {
  try {
    const raw = await fs.readFile(PAYMENT_METHODS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      methods: Array.isArray(parsed.methods) ? (parsed.methods as PaymentMethodRecord[]) : [],
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return { methods: [], updatedAt: 0 };
  }
}

async function writePaymentMethodsFile(state: PaymentMethodsState): Promise<void> {
  try {
    await fs.writeFile(PAYMENT_METHODS_FILE, JSON.stringify(state), "utf-8");
  } catch (err) {
    console.error("writePaymentMethodsFile:", err);
  }
}

export async function getPaymentMethodsState(): Promise<PaymentMethodsState> {
  try {
    const { data, error } = await getSupabase()
      .from("payment_methods")
      .select("methods, updated_at")
      .eq("id", "main")
      .maybeSingle();
    if (error) throw error;
    if (data) {
      return {
        methods: Array.isArray(data.methods) ? (data.methods as PaymentMethodRecord[]) : [],
        updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : 0,
      };
    }
  } catch (err) {
    console.error("getPaymentMethodsState (fallback archivo local):", err);
  }
  return readPaymentMethodsFile();
}

export async function setPaymentMethodsState(methods: PaymentMethodRecord[]): Promise<PaymentMethodsState> {
  const iso = new Date().toISOString();
  const state: PaymentMethodsState = { methods, updatedAt: new Date(iso).getTime() };
  try {
    const { error } = await getSupabase()
      .from("payment_methods")
      .upsert({ id: "main", methods, updated_at: iso });
    if (error) throw error;
  } catch (err) {
    console.error("setPaymentMethodsState (fallback archivo local):", err);
  }
  await writePaymentMethodsFile(state);
  return state;
}
