import type { Order, OrderStatus } from "./orderTypes";
import { generateOrderCode } from "./format";

export type { Order, OrderStatus };

const STORAGE_KEY = "blox-orders";

function readOrders(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function writeOrders(orders: Order[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // ignore
  }
}

async function notifyOrdersChanged(orders: Order[]) {
  if (typeof window === "undefined") return;
  try {
    const { getSyncBus } = await import("./sync");
    getSyncBus().send({
      type: "orders:changed",
      payload: { orders },
    });
  } catch {
    // ignore
  }
}

export function getOrders(phone?: string): Order[] {
  const all = readOrders();
  if (phone) return all.filter((o) => o.user.phone === phone);
  return all;
}

export function updateOrderStatus(code: string, status: OrderStatus): void {
  const all = readOrders();
  const updated = all.map((o) => (o.code === code ? { ...o, status } : o));
  writeOrders(updated);
  notifyOrdersChanged(updated);
}

export function getOrderByCode(code: string): Order | undefined {
  return readOrders().find((o) => o.code === code);
}

export function formatOrderDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export const statusLabels: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const statusColors: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  delivered: "bg-green-500/10 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/30",
};
