"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOrders, formatOrderDate, type Order } from "@/lib/orders";
import { products as staticProducts } from "@/lib/products";
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
    const orders = getOrders();

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
      recentOrders: orders.slice(0, 5),
    });
  }, [products]);

  if (!stats) {
    return (
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-lg sm:text-xl">📊</span>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-normal text-white" style={{ fontFamily: "var(--font-cormorant)" }}>
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-white/40">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Total Pedidos", value: stats.totalOrders, icon: "📋", color: "accent" },
    { label: "Pendientes", value: stats.pending, icon: "⏳", color: "yellow" },
    { label: "Confirmados", value: stats.confirmed, icon: "✓", color: "blue" },
    { label: "Entregados", value: stats.delivered, icon: "📦", color: "green" },
    { label: "Cancelados", value: stats.cancelled, icon: "✕", color: "red" },
    { label: "Clientes Únicos", value: stats.uniqueCustomers, icon: "👥", color: "purple" },
  ];

  const colorClasses: Record<string, string> = {
    accent: "border-accent/20 hover:border-accent/40",
    yellow: "border-yellow-500/20 hover:border-yellow-500/40",
    blue: "border-blue-500/20 hover:border-blue-500/40",
    green: "border-green-500/20 hover:border-green-500/40",
    red: "border-red-500/20 hover:border-red-500/40",
    purple: "border-purple-500/20 hover:border-purple-500/40",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-full flex items-center justify-center border border-accent/30 flex-shrink-0">
            <span className="text-lg sm:text-xl">📊</span>
          </div>
          <div className="min-w-0">
            <h1
              className="text-xl sm:text-2xl font-normal text-white"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-white/40 truncate">
              Resumen de la actividad reciente
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mb-6 sm:mb-8">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`bg-scene-900 border ${colorClasses[c.color]} rounded-2xl p-3 sm:p-4 transition-colors`}
          >
            <div className="text-xl sm:text-2xl mb-1.5 sm:mb-2">{c.icon}</div>
            <p
              className="text-xl sm:text-2xl font-bold text-white"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              {c.value}
            </p>
            <p className="text-[10px] sm:text-xs text-white/40 mt-0.5 sm:mt-1 leading-tight">
              {c.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-scene-900 border border-accent/20 rounded-2xl p-4 sm:p-6 glow-red">
          <div className="flex items-start justify-between mb-4 gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
                Ingresos Totales
              </p>
              <div className="space-y-1">
                {(Object.entries(stats.totalRevenue) as [Currency, number][])
                  .filter(([, total]) => total > 0)
                  .map(([c, total]) => (
                    <p
                      key={c}
                      className="text-xl sm:text-2xl font-bold text-accent glow-text break-all"
                      style={{ fontFamily: "var(--font-cormorant)" }}
                    >
                      {formatCurrency(total, c)}
                    </p>
                  ))}
                {Object.values(stats.totalRevenue).every((v) => v === 0) && (
                  <p
                    className="text-xl sm:text-2xl font-bold text-accent glow-text"
                    style={{ fontFamily: "var(--font-cormorant)" }}
                  >
                    S/ 0
                  </p>
                )}
              </div>
            </div>
            <span className="text-2xl sm:text-3xl flex-shrink-0">💰</span>
          </div>
          <p className="text-xs text-white/40">
            Excluye pedidos cancelados
          </p>
        </div>

        <div className="bg-scene-900 border border-white/5 rounded-2xl p-4 sm:p-6">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-4">
            Más Vendidos
          </p>
          {stats.topProducts.length === 0 ? (
            <p className="text-white/40 text-sm">Sin ventas aún</p>
          ) : (
            <div className="space-y-3">
              {stats.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span className="w-6 h-6 rounded-full bg-accent/10 text-accent text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-white text-xs sm:text-sm truncate">{p.name}</span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-accent text-xs sm:text-sm font-semibold">{p.count}×</p>
                    <p className="text-white/40 text-[10px]">
                      {formatCurrency(p.revenue, p.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-scene-900 border border-white/5 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 gap-2">
            <p className="text-xs text-white/40 uppercase tracking-wider">
              Pedidos Recientes
            </p>
            <Link href="/pedidos" className="text-accent text-xs hover:text-accent-light whitespace-nowrap">
              Ver todos →
            </Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="text-white/40 text-sm">No hay pedidos aún</p>
          ) : (
            <div className="space-y-2.5">
              {stats.recentOrders.map((o) => {
                const primaryCurrency = (Object.entries(o.totalsByCurrency || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || "PEN") as Currency;
                const total = (o.totalsByCurrency || {})[primaryCurrency] || 0;
                return (
                  <div key={o.code} className="flex items-center justify-between text-sm gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-accent font-mono text-xs truncate">{o.code}</p>
                      <p className="text-white/60 text-xs truncate">{o.user.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white text-xs sm:text-sm font-medium">
                        {formatCurrency(total, primaryCurrency)}
                      </p>
                      <p className="text-white/40 text-[10px]">{formatOrderDate(o.createdAt)}</p>
                    </div>
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
