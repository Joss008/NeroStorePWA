"use client";

import { useEffect, useState, useCallback } from "react";
import type { Product, Category, Rarity } from "./products";
import { getSyncBus } from "./sync";

export const CUSTOM_KEY = "blox-admin-products";
export const HIDDEN_KEY = "blox-admin-hidden";

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

async function syncToApi(custom: Product[], hidden: string[]) {
  if (typeof window === "undefined") return;
  const endpoints = [
    "/admin/api/products",
    "/api/products",
    "http://localhost:3000/api/products",
    "http://localhost:3001/admin/api/products",
    "http://localhost:3002/admin/api/products",
    "http://localhost:4000/api/products",
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom, hidden }),
      });
      if (res.ok) break;
    } catch {
      // try next endpoint
    }
  }
}

function notifyProductsChanged() {
  if (typeof window === "undefined") return;
  const custom = readJSON<Product[]>(CUSTOM_KEY, []);
  const hidden = readJSON<string[]>(HIDDEN_KEY, []);

  getSyncBus().send({
    type: "products:changed",
    payload: { custom, hidden },
  });

  syncToApi(custom, hidden).catch(() => {});
}

export function getCustomProducts(): Product[] {
  return readJSON<Product[]>(CUSTOM_KEY, []);
}

export function getHiddenIds(): string[] {
  return readJSON<string[]>(HIDDEN_KEY, []);
}

export function getMergedProducts(staticProducts: Product[]): Product[] {
  const custom = getCustomProducts();
  const hidden = getHiddenIds();

  const customMap = new Map<string, Product>();
  for (const c of custom) {
    if (c && c.id) {
      customMap.set(c.id, c);
    }
  }

  const staticIds = new Set(staticProducts.map((p) => p.id));

  // 1. Nuevos productos personalizados que no estaban en staticProducts
  const newCustom = custom.filter((p) => !staticIds.has(p.id) && !hidden.includes(p.id));

  // 2. Productos estáticos: si fueron editados, se usa la versión de customMap; si están en hidden, se omiten
  const mergedStatic: Product[] = [];
  for (const sp of staticProducts) {
    if (hidden.includes(sp.id)) continue;
    if (customMap.has(sp.id)) {
      mergedStatic.push(customMap.get(sp.id)!);
    } else {
      mergedStatic.push(sp);
    }
  }

  return [...newCustom, ...mergedStatic];
}

export function addCustomProduct(product: Product): void {
  const custom = getCustomProducts();
  const filtered = custom.filter((p) => p.id !== product.id);
  filtered.unshift(product);
  writeJSON(CUSTOM_KEY, filtered);

  const hidden = getHiddenIds().filter((id) => id !== product.id);
  writeJSON(HIDDEN_KEY, hidden);

  notifyProductsChanged();
}

export function updateProduct(product: Product): void {
  const custom = getCustomProducts();
  const existingIndex = custom.findIndex((p) => p.id === product.id);

  if (existingIndex >= 0) {
    custom[existingIndex] = product;
  } else {
    // Es un producto estático editado por primera vez
    custom.unshift(product);
  }

  // IMPORTANTE: Asegurar que NO esté en hidden al editarse
  const hidden = getHiddenIds().filter((id) => id !== product.id);
  writeJSON(HIDDEN_KEY, hidden);
  writeJSON(CUSTOM_KEY, custom);

  notifyProductsChanged();
}

export function hideProduct(id: string): void {
  const custom = getCustomProducts().filter((p) => p.id !== id);
  writeJSON(CUSTOM_KEY, custom);

  const hidden = getHiddenIds();
  if (!hidden.includes(id)) {
    hidden.push(id);
    writeJSON(HIDDEN_KEY, hidden);
  }

  notifyProductsChanged();
}

export function toggleStock(id: string, inStock: boolean, staticProducts: Product[]): void {
  const allMerged = getMergedProducts(staticProducts);
  const found = allMerged.find((p) => p.id === id);
  if (!found) return;

  const updated: Product = { ...found, inStock };
  updateProduct(updated);
}

export function togglePopular(id: string, popular: boolean, staticProducts: Product[]): void {
  const allMerged = getMergedProducts(staticProducts);
  const found = allMerged.find((p) => p.id === id);
  if (!found) return;

  const updated: Product = { ...found, popular };
  updateProduct(updated);
}

export function useMergedProducts(staticProducts: Product[]) {
  const [products, setProducts] = useState<Product[]>(staticProducts);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    setProducts(getMergedProducts(staticProducts));
  }, [staticProducts]);

  useEffect(() => {
    // 1. Cargar de inmediato desde localStorage
    setProducts(getMergedProducts(staticProducts));
    setLoaded(true);

    // 2. Conciliar con almacenamiento compartido / API
    async function reconcileWithApi() {
      try {
        const endpoints = [
          "/admin/api/products",
          "/api/products",
          "http://localhost:3000/api/products",
          "http://localhost:3001/admin/api/products",
          "http://localhost:3002/admin/api/products",
          "http://localhost:4000/api/products",
        ];
        for (const ep of endpoints) {
          try {
            const res = await fetch(ep, { cache: "no-store" });
            if (res.ok) {
              const data = await res.json();
              if (!data.updatedAt) {
                const localCustom = getCustomProducts();
                const localHidden = getHiddenIds();
                if (localCustom.length > 0 || localHidden.length > 0) {
                  syncToApi(localCustom, localHidden);
                }
              } else if (Array.isArray(data.custom) && Array.isArray(data.hidden)) {
                writeJSON(CUSTOM_KEY, data.custom);
                writeJSON(HIDDEN_KEY, data.hidden);
                setProducts(getMergedProducts(staticProducts));
              }
              break;
            }
          } catch {
            // probar siguiente
          }
        }
      } catch {
        // ignorar
      }
    }

    reconcileWithApi();

    // 3. Suscripción a canal de sincronización
    const bus = getSyncBus();
    const unsubscribe = bus.subscribe((event) => {
      if (event.type === "products:changed" || event.type === "catalog:snapshot") {
        setProducts(getMergedProducts(staticProducts));
      }
    });

    const onFocus = () => {
      setProducts(getMergedProducts(staticProducts));
      reconcileWithApi();
    };
    window.addEventListener("focus", onFocus);

    const poll = setInterval(reconcileWithApi, 20000);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", onFocus);
      clearInterval(poll);
    };
  }, [staticProducts]);

  return { products, loaded, refresh };
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function generateCustomId(): string {
  return `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export const ALL_CATEGORIES: Category[] = [
  "Mythical Fruits",
  "Legendary Fruits",
  "Rare Fruits",
  "Uncommon Fruits",
  "Common Fruits",
  "Gamepasses",
  "Servicios",
];

export const ALL_RARITIES: (Rarity | "Servicio" | "Gamepass")[] = [
  "Mythical",
  "Legendary",
  "Rare",
  "Uncommon",
  "Common",
  "Gamepass",
  "Servicio",
];

export const RARITY_GRADIENTS: Record<string, string> = {
  Mythical: "linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #450a0a 100%)",
  Legendary: "linear-gradient(135deg, #78350f 0%, #f59e0b 50%, #451a03 100%)",
  Rare: "linear-gradient(135deg, #4c1d95 0%, #a855f7 50%, #2e1065 100%)",
  Uncommon: "linear-gradient(135deg, #155e75 0%, #22d3ee 50%, #083344 100%)",
  Common: "linear-gradient(135deg, #374151 0%, #6b7280 50%, #1f2937 100%)",
  Servicio: "linear-gradient(135deg, #1f1611 0%, #ef4444 50%, #0a0506 100%)",
  Gamepass: "linear-gradient(135deg, #1a0a0a 0%, #ef4444 50%, #050505 100%)",
};
