"use client";

import { useEffect, useState } from "react";
import {
  fetchOrders,
  updateOrderStatus,
  formatOrderDate,
  statusLabels,
  statusColors,
  type Order,
} from "@/lib/orders";
import { formatCurrency } from "@/lib/format";
import type { Currency } from "@/lib/products";

const STATUSES: Array<Order["status"] | "ALL"> = ["ALL", "pending", "confirmed", "delivered", "cancelled"];

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Order["status"] | "ALL">("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetchOrders().then((remote) => {
      if (!cancelled) setOrders(remote);
    });

    const poll = setInterval(() => {
      fetchOrders().then((remote) => {
        if (!cancelled) setOrders(remote);
      });
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  async function refresh() {
    const remote = await fetchOrders();
    setOrders(remote);
  }

  async function handleStatusChange(code: string, newStatus: Order["status"]) {
    setOrders((prev) => prev.map((o) => (o.code === code ? { ...o, status: newStatus } : o)));
    await updateOrderStatus(code, newStatus);
    refresh();
  }

  const filtered = orders.filter((o) => {
    const matchStatus = filter === "ALL" || o.status === filter;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      o.code.toLowerCase().includes(q) ||
      o.user.name.toLowerCase().includes(q) ||
      o.user.phone.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const filterCounts = {
    ALL: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center border border-accent/30">
          <span className="text-xl">📋</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            Pedidos
          </h1>
          <p className="text-sm text-white/40">Gestiona los pedidos de los clientes</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === s
                  ? "bg-accent text-white glow-red"
                  : "bg-scene-900 text-white/60 border border-white/10 hover:border-accent/30"
              }`}
            >
              {s === "ALL" ? "Todos" : statusLabels[s]} ({filterCounts[s]})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, nombre o teléfono..."
            className="w-full bg-scene-900 border border-white/10 rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-colors"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-scene-900 border border-white/5 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-scene-800 flex items-center justify-center mx-auto mb-4 text-3xl">
            📋
          </div>
          <p className="text-white/60 mb-2 text-lg">
            {orders.length === 0 ? "No hay pedidos aún" : "No hay pedidos con ese filtro"}
          </p>
          <p className="text-white/40 text-sm">
            Los pedidos aparecerán aquí cuando los clientes los envíen
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <OrderRow
              key={order.code}
              order={order}
              expanded={expanded === order.code}
              onToggle={() => setExpanded(expanded === order.code ? null : order.code)}
              onStatusChange={(status) => handleStatusChange(order.code, status)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface OrderRowProps {
  order: Order;
  expanded: boolean;
  onToggle: () => void;
  onStatusChange: (s: Order["status"]) => void;
}

function OrderRow({ order, expanded, onToggle, onStatusChange }: OrderRowProps) {
  const totals = order.totalsByCurrency || {};

  return (
    <div className="bg-scene-900 border border-white/5 hover:border-accent/20 rounded-2xl overflow-hidden transition-colors">
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <span
            className="font-mono font-bold text-accent text-sm whitespace-nowrap"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {order.code}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-white text-sm truncate">{order.user.name}</p>
            <p className="text-xs text-white/40 truncate">
              {order.user.countryFlag || ""} {order.user.countryCode || ""} {order.user.phone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-white/40">{order.items.length} items</p>
            <p className="text-xs text-white/40">{formatOrderDate(order.createdAt)}</p>
          </div>
          <span
            className={`text-[10px] font-medium tracking-wider uppercase px-2.5 py-1 rounded-full border ${statusColors[order.status]}`}
          >
            {statusLabels[order.status]}
          </span>
          <select
            value={order.status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onStatusChange(e.target.value as Order["status"])}
            className="bg-scene-950 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-accent transition-colors"
          >
            <option value="pending">Pendiente</option>
            <option value="confirmed">Confirmado</option>
            <option value="delivered">Entregado</option>
            <option value="cancelled">Cancelado</option>
          </select>
          <span className="text-white/30 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 px-4 sm:px-5 py-4 sm:py-5 space-y-4 sm:space-y-5 bg-scene-950/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <InfoBox label="Cliente" value={order.user.name} />
            <InfoBox
              label="Teléfono"
              value={`${order.user.countryFlag || ""} ${order.user.countryCode || ""} ${order.user.phone}`.trim()}
            />
            <InfoBox label="Items" value={`${order.items.length}`} />
            <div className="bg-scene-900 border border-white/5 rounded-xl p-3">
              <p className="text-[10px] font-medium tracking-wider uppercase text-white/40 mb-1">
                Total
              </p>
              <div className="space-y-0.5">
                {(Object.entries(totals) as [Currency, number][])
                  .filter(([, v]) => v > 0)
                  .map(([c, v]) => (
                    <p key={c} className="text-sm text-accent font-bold">
                      {formatCurrency(v, c)}
                    </p>
                  ))}
                {Object.values(totals).every((v) => !v) && (
                  <p className="text-sm text-accent font-bold">
                    {formatCurrency(order.total, order.currency as Currency)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium tracking-wider uppercase text-accent mb-3">
              Items del pedido
            </h4>
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="bg-scene-900 border border-white/5 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-medium text-white text-sm">{item.productName}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="inline-block text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                          {item.category}
                        </span>
                        <span className="inline-block text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded-full bg-scene-800 text-white/60 border border-white/10">
                          {item.currency}
                        </span>
                        {item.mode && (
                          <span
                            className={`inline-block text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                              item.mode === "permanente"
                                ? "bg-green-500/10 text-green-400 border-green-500/30"
                                : "bg-orange-500/10 text-orange-400 border-orange-500/30"
                            }`}
                          >
                            {item.mode === "permanente" ? "♾️ Permanente" : "🕐 Físico"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-white">
                        {item.quantity}× {formatCurrency(item.price, item.currency)}
                      </p>
                      <p className="text-accent font-bold">
                        {formatCurrency(item.subtotal, item.currency)}
                      </p>
                    </div>
                  </div>
                  {item.notes && (
                    <p className="text-xs text-white/50 mt-2 border-l-2 border-accent/30 pl-3">
                      {item.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoBox
              label="Método de Pago"
              value={order.paymentMethod.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            />
            <InfoBox label="Fecha" value={formatOrderDate(order.createdAt)} />
          </div>

          {order.notes && (
            <div>
              <h4 className="text-xs font-medium tracking-wider uppercase text-accent mb-2">
                Notas del pedido
              </h4>
              <p className="text-sm text-white/70 bg-scene-900 border border-white/5 rounded-xl p-4">
                {order.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-scene-900 border border-white/5 rounded-xl p-3">
      <p className="text-[10px] font-medium tracking-wider uppercase text-white/40 mb-1">
        {label}
      </p>
      <p className={`text-sm ${accent ? "text-accent font-bold" : "text-white"}`}>{value}</p>
    </div>
  );
}