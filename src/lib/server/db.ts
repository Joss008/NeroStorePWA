import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/lib/products";

let client: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variable");
    }
    client = createClient(url, key, { auth: { persistSession: false } });
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
