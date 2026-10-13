"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchOrders, formatOrderDate, statusLabels, statusColors, type Order } from "@/lib/orders";
import { products as staticProducts, ALL_CURRENCIES } from "@/lib/products";
import { useMergedProducts } from "@/lib/useProducts";
import { formatCurrency } from "@/lib/format";
import type { Currency } from "@/lib/products";

interface DashboardStats {
  totalOrders: number;
  pending: number;
  confirmed: number;
  delivered: number;
  cancelled: number;
  totalRevenue: Record<Currency, number>;
  productCount: number;
  uniqueCustomers: number;
  topProducts: { name: string; count: number; revenue: number; currency: Currency }[];
  recentOrders: Order[];
}

export default function DashboardPage() {
  const { products } = useMergedProducts(staticProducts);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const orders = await fetchOrders();

      const productSales = new Map<string, { count: number; revenue: Record<Currency, number> }>();
      const addSale = (key: string, currency: Currency, qty: number, revenue: number) => {
        const prev = productSales.get(key) || { count: 0, revenue: { PEN: 0, MXN: 0, COP: 0 } };
        prev.count += qty;
        prev.revenue[currency] = (prev.revenue[currency] || 0) + revenue;
        productSales.set(key, prev);
      };

      orders.forEach((o) => {
        o.items.forEach((item) => {
          addSale(item.productName, item.currency, item.quantity, item.subtotal);
        });
      });

      const topProducts = Array.from(productSales.entries())
        .map(([name, v]) => {
          const primaryCurrency = (Object.entries(v.revenue).sort((a, b) => b[1] - a[1])[0]?.[0] || "PEN") as Currency;
          return { name, count: v.count, revenue: v.revenue[primaryCurrency] || 0, currency: primaryCurrency };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const uniqueCustomers = new Set(orders.map((o) => o.user.phone)).size;

      const totalRevenue: Record<Currency, number> = { PEN: 0, MXN: 0, COP: 0 };
      orders
        .filter((o) => o.status !== "cancelled")
        .forEach((o) => {
          o.items.forEach((item) => {
            totalRevenue[item.currency] = (totalRevenue[item.currency] || 0) + item.subtotal;
          });
        });

      if (!alive) return;
      setStats({
        totalOrders: orders.length,
        pending: orders.filter((o) => o.status === "pending").length,
        confirmed: orders.filter((o) => o.status === "confirmed").length,
        delivered: orders.filter((o) => o.status === "delivered").length,
        cancelled: orders.filter((o) => o.status === "cancelled").length,
        totalRevenue,
        productCount: products.length,
        uniqueCustomers,
        topProducts,
        recentOrders: [...orders]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5),
      });
    })();

    return () => {
      alive = false;
    };
  }, [products]);

  if (!stats) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/5" />
          <div>
            <div className="h-6 w-40 bg-white/5 rounded" />
            <div className="h-3 w-56 bg-white/5 rounded mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-scene-900 border border-white/5 rounded-2xl h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-scene-900 border border-white/5 rounded-2xl h-44" />
          <div className="bg-scene-900 border border-white/5 rounded-2xl h-44 lg:col-span-2" />
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Total Pedidos", value: stats.totalOrders, icon: "📋", tint: "bg-accent/10 text-accent" },
    { label: "Pendientes", value: stats.pending, icon: "⏳", tint: "bg-yellow-500/10 text-yellow-400" },
    { label: "Confirmados", value: stats.confirmed, icon: "✓", tint: "bg-blue-500/10 text-blue-400" },
    { label: "Entregados", value: stats.delivered, icon: "📦", tint: "bg-green-500/10 text-green-400" },
    { label: "Cancelados", value: stats.cancelled, icon: "✕", tint: "bg-red-500/10 text-red-400" },
    { label: "Clientes", value: stats.uniqueCustomers, icon: "👥", tint: "bg-purple-500/10 text-purple-400" },
  ];

  const statusData = [
    { label: "Pendientes", count: stats.pending, bar: "bg-yellow-500", dot: "bg-yellow-400" },
    { label: "Confirmados", count: stats.confirmed, bar: "bg-blue-500", dot: "bg-blue-400" },
    { label: "Entregados", count: stats.delivered, bar: "bg-green-500", dot: "bg-green-400" },
    { label: "Cancelados", count: stats.cancelled, bar: "bg-red-500", dot: "bg-red-400" },
  ];
  const statusTotal = Math.max(1, stats.pending + stats.confirmed + stats.delivered + stats.cancelled);

  const revenueEntries = (Object.entries(stats.totalRevenue) as [Currency, number][])
    .filter(([, total]) => total > 0)
    .sort((a, b) => ALL_CURRENCIES.indexOf(a[0]) - ALL_CURRENCIES.indexOf(b[0]));

  const topMax = stats.topProducts[0]?.count || 1;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* HEADER CON ACCESOS RÁPIDOS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-11 h-11 bg-accent/10 rounded-xl flex items-center justify-center border border-accent/20 flex-shrink-0">
            <span className="text-lg">📊</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-xs sm:text-sm text-white/40">Resumen de la actividad reciente</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/pedidos"
            className="px-4 py-2 rounded-full text-xs font-semibold text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
          >
            Ver pedidos
          </Link>
          <Link
            href="/productos"
            className="px-4 py-2 rounded-full text-xs font-semibold text-white bg-accent hover:bg-accent-light transition-colors glow-red"
          >
            + Nuevo producto
          </Link>
        </div>
      </div>

      {/* FILA DE KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-scene-900 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] sm:text-[11px] text-white/40 uppercase tracking-wider font-medium leading-tight">
                {c.label}
              </p>
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${c.tint}`}
              >
                {c.icon}
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white mt-2">{c.value}</p>
          </div>
        ))}
      </div>

      {/* INGRESOS + DISTRIBUCIÓN DE ESTADOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-scene-900 border border-accent/20 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-white/40 uppercase tracking-wider">Ingresos Totales</p>
            <span className="text-lg">💰</span>
          </div>
          <div className="space-y-2.5 flex-1">
            {revenueEntries.length === 0 ? (
              <p className="text-2xl font-bold text-white/80">S/ 0</p>
            ) : (
              revenueEntries.map(([c, total]) => (
                <div key={c} className="flex items-baseline justify-between gap-3">
                  <span className="text-[11px] text-white/40 uppercase tracking-wider">{c}</span>
                  <span className={`text-xl font-bold ${c === "PEN" ? "text-accent glow-text" : "text-white/80"}`}>
                    {formatCurrency(total, c)}
                  </span>
                </div>
              ))
            )}
          </div>
          <p className="text-[11px] text-white/30 mt-4 pt-3 border-t border-white/5">
            Excluye pedidos cancelados
          </p>
        </div>

        <div className="bg-scene-900 border border-white/5 rounded-2xl p-5 lg:col-span-2">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Distribución de Estados</p>
          <div className="h-2.5 rounded-full bg-white/5 overflow-hidden flex mb-4">
            {statusData
              .filter((s) => s.count > 0)
              .map((s) => (
                <div
                  key={s.label}
                  className={`${s.bar} h-full transition-all duration-500`}
                  style={{ width: `${(s.count / statusTotal) * 100}%` }}
                />
              ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statusData.map((s) => (
              <div key={s.label} className="bg-scene-950/60 border border-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className="text-[10px] text-white/40 uppercase tracking-wider truncate">{s.label}</span>
                </div>
                <p className="text-xl font-bold text-white">{s.count}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MÁS VENDIDOS + PEDIDOS RECIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-scene-900 border border-white/5 rounded-2xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-4">Más Vendidos</p>
          {stats.topProducts.length === 0 ? (
            <p className="text-white/40 text-sm">Sin ventas aún</p>
          ) : (
            <div className="space-y-4">
              {stats.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-accent/10 text-accent text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm text-white truncate">{p.name}</span>
                      <span className="text-xs text-white/40 flex-shrink-0">{p.count} ventas</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, (p.count / topMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-accent flex-shrink-0 text-right">
                    {formatCurrency(p.revenue, p.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-scene-900 border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 gap-2">
            <p className="text-xs text-white/40 uppercase tracking-wider">Pedidos Recientes</p>
            <Link href="/pedidos" className="text-accent text-xs hover:text-accent-light whitespace-nowrap">
              Ver todos →
            </Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="text-white/40 text-sm">No hay pedidos aún</p>
          ) : (
            <div className="space-y-2">
              {stats.recentOrders.map((o) => {
                const primaryCurrency = (Object.entries(o.totalsByCurrency || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || "PEN") as Currency;
                const total = (o.totalsByCurrency || {})[primaryCurrency] || 0;
                return (
                  <div
                    key={o.code}
                    className="flex items-center gap-3 bg-scene-950/50 border border-white/5 rounded-xl px-3 py-2.5 hover:border-white/10 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-accent font-semibold">{o.code}</span>
                        <span
                          className={`text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusColors[o.status]}`}
                        >
                          {statusLabels[o.status]}
                        </span>
                      </div>
                      <p className="text-xs text-white/50 truncate mt-1">
                        {o.user.name} · {formatOrderDate(o.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-white flex-shrink-0">
                      {formatCurrency(total, primaryCurrency)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
