"use client";

import { useState, useRef, useMemo } from "react";
import {
  products as staticProducts,
  type Product,
  type Rarity,
  type Category,
  type Currency,
  ALL_CURRENCIES,
} from "@/lib/products";
import {
  useMergedProducts,
  addCustomProduct,
  hideProduct,
  updateProduct,
  toggleStock,
  togglePopular,
  generateSlug,
  generateCustomId,
  ALL_CATEGORIES,
  ALL_RARITIES,
  RARITY_GRADIENTS,
} from "@/lib/useProducts";
import { formatCurrency, CURRENCY_LABELS, CURRENCY_FLAGS } from "@/lib/format";
import AnimatedList from "@/components/AnimatedList";

interface FormState {
  name: string;
  slug: string;
  category: Category;
  rarity: Rarity | "Servicio" | "Gamepass";
  emoji: string;
  prices: Record<Currency, string>;
  originalPrices: Record<Currency, string>;
  physicalPrices: Record<Currency, string>;
  hasDiscount: boolean;
  discountPercent: number;
  hasPhysical: boolean;
  shortDescription: string;
  description: string;
  features: string[];
  newFeatureInput: string;
  inStock: boolean;
  popular: boolean;
  imageUrl: string;
  imageData: string;
}

const emptyPrices: Record<Currency, string> = { PEN: "", MXN: "", COP: "" };

const emptyForm: FormState = {
  name: "",
  slug: "",
  category: "Mythical Fruits",
  rarity: "Mythical",
  emoji: "🐲",
  prices: { ...emptyPrices },
  originalPrices: { ...emptyPrices },
  physicalPrices: { ...emptyPrices },
  hasDiscount: false,
  discountPercent: 0,
  hasPhysical: false,
  shortDescription: "",
  description: "",
  features: ["Entrega inmediata", "Garantizado"],
  newFeatureInput: "",
  inStock: true,
  popular: false,
  imageUrl: "",
  imageData: "",
};

const SUGGESTED_EMOJIS = [
  { emoji: "🐲", label: "Dragón" },
  { emoji: "🦊", label: "Kitsune" },
  { emoji: "🐆", label: "Leopard" },
  { emoji: "⚡", label: "Rayo" },
  { emoji: "🍎", label: "Fruta" },
  { emoji: "🍇", label: "Mítica" },
  { emoji: "🗡️", label: "Espada" },
  { emoji: "⚓", label: "Barco" },
  { emoji: "🎫", label: "Pase" },
  { emoji: "📦", label: "Item" },
];

function productToForm(p: Product): FormState {
  const hasDisc = !!p.originalPrices && Object.values(p.originalPrices).some((v) => typeof v === "number" && v > 0);
  const hasPhys = !!p.physicalPrices && Object.values(p.physicalPrices).some((v) => typeof v === "number" && v > 0);

  let discPercent = 0;
  if (hasDisc && p.originalPrices?.PEN && p.prices.PEN) {
    discPercent = Math.round(((p.originalPrices.PEN - p.prices.PEN) / p.originalPrices.PEN) * 100);
  }

  return {
    name: p.name,
    slug: p.slug,
    category: p.category,
    rarity: p.rarity,
    emoji: p.emoji || "📦",
    prices: {
      PEN: String(p.prices.PEN ?? ""),
      MXN: String(p.prices.MXN ?? ""),
      COP: String(p.prices.COP ?? ""),
    },
    originalPrices: {
      PEN: p.originalPrices?.PEN ? String(p.originalPrices.PEN) : "",
      MXN: p.originalPrices?.MXN ? String(p.originalPrices.MXN) : "",
      COP: p.originalPrices?.COP ? String(p.originalPrices.COP) : "",
    },
    physicalPrices: {
      PEN: p.physicalPrices?.PEN ? String(p.physicalPrices.PEN) : "",
      MXN: p.physicalPrices?.MXN ? String(p.physicalPrices.MXN) : "",
      COP: p.physicalPrices?.COP ? String(p.physicalPrices.COP) : "",
    },
    hasDiscount: hasDisc,
    discountPercent: discPercent,
    hasPhysical: hasPhys,
    shortDescription: p.shortDescription || "",
    description: p.description || "",
    features: Array.isArray(p.features) ? [...p.features] : [],
    newFeatureInput: "",
    inStock: p.inStock ?? true,
    popular: !!p.popular,
    imageUrl: p.imageUrl || "",
    imageData: p.imageData || "",
  };
}

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024; // 1.5 MB

export default function ProductosPage() {
  const { products, refresh } = useMergedProducts(staticProducts);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "activos" | "agotados" | "destacados">("todos");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [activeTab, setActiveTab] = useState<"general" | "precios" | "multimedia">("general");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Métricas rápidas
  const stats = useMemo(() => {
    return {
      total: products.length,
      activos: products.filter((p) => p.inStock).length,
      agotados: products.filter((p) => !p.inStock).length,
      destacados: products.filter((p) => p.popular).length,
    };
  }, [products]);

  function openCreate() {
    setEditingProduct(null);
    setForm(emptyForm);
    setActiveTab("general");
    setError("");
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditingProduct(p);
    setForm(productToForm(p));
    setActiveTab("general");
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
    setEditingProduct(null);
    setForm(emptyForm);
    setError("");
  }

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updatePrice(c: Currency, value: string) {
    setForm((prev) => ({ ...prev, prices: { ...prev.prices, [c]: value } }));
  }

  function updateOriginalPrice(c: Currency, value: string) {
    setForm((prev) => ({ ...prev, originalPrices: { ...prev.originalPrices, [c]: value } }));
  }

  function updatePhysicalPrice(c: Currency, value: string) {
    setForm((prev) => ({ ...prev, physicalPrices: { ...prev.physicalPrices, [c]: value } }));
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
    }));
  }

  // Auto-conversor de moneda basado en Soles (PEN)
  function handleAutoConvertCurrencies() {
    const penVal = parseFloat(form.prices.PEN);
    if (isNaN(penVal) || penVal <= 0) {
      setError("Ingresa un precio válido en Soles (PEN) primero para auto-calcular las otras monedas.");
      return;
    }
    setError("");
    // Tasas de cambio estimadas y redondeadas para e-commerce:
    // 1 PEN ≈ 5.3 MXN
    // 1 PEN ≈ 1,050 COP
    const mxnVal = Math.round(penVal * 5.3);
    const copVal = Math.round((penVal * 1050) / 100) * 100; // Redondeado a centenas

    setForm((prev) => {
      const newForm = {
        ...prev,
        prices: {
          ...prev.prices,
          MXN: String(mxnVal),
          COP: String(copVal),
        },
      };

      // Si tiene descuento activo, recalcular precios originales
      if (prev.hasDiscount && prev.discountPercent > 0) {
        const factor = 1 - prev.discountPercent / 100;
        newForm.originalPrices = {
          PEN: String(Math.round(penVal / factor)),
          MXN: String(Math.round(mxnVal / factor)),
          COP: String(Math.round((copVal / factor) / 100) * 100),
        };
      }

      return newForm;
    });

    showToast("✨ Precios en MXN y COP calculados automáticamente");
  }

  // Aplicar porcentaje de descuento de 1 clic
  function applyDiscountPercent(percent: number) {
    if (percent === 0) {
      setForm((prev) => ({
        ...prev,
        hasDiscount: false,
        discountPercent: 0,
        originalPrices: { PEN: "", MXN: "", COP: "" },
      }));
      return;
    }

    const pen = parseFloat(form.prices.PEN) || 0;
    const mxn = parseFloat(form.prices.MXN) || 0;
    const cop = parseFloat(form.prices.COP) || 0;

    const factor = 1 - percent / 100;

    setForm((prev) => ({
      ...prev,
      hasDiscount: true,
      discountPercent: percent,
      originalPrices: {
        PEN: pen > 0 ? String(Math.round(pen / factor)) : "",
        MXN: mxn > 0 ? String(Math.round(mxn / factor)) : "",
        COP: cop > 0 ? String(Math.round((cop / factor) / 100) * 100) : "",
      },
    }));
  }

  function handleAddFeature() {
    if (!form.newFeatureInput.trim()) return;
    setForm((prev) => ({
      ...prev,
      features: [...prev.features, prev.newFeatureInput.trim()],
      newFeatureInput: "",
    }));
  }

  function handleRemoveFeature(index: number) {
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen (PNG, JPG, WEBP, etc.)");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError(`La imagen es muy grande (máx. 1.5 MB). Tamaño: ${(file.size / 1024).toFixed(0)} KB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setForm((prev) => ({ ...prev, imageData: result, imageUrl: "" }));
        setError("");
        showToast("Imagen cargada con éxito");
      }
    };
    reader.onerror = () => setError("No se pudo leer el archivo");
    reader.readAsDataURL(file);
  }

  function clearImage() {
    setForm((prev) => ({ ...prev, imageUrl: "", imageData: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Toggles de 1 clic en la lista
  function handleQuickToggleStock(p: Product) {
    const nextState = !p.inStock;
    toggleStock(p.id, nextState, staticProducts);
    refresh();
    showToast(nextState ? `🟢 ${p.name} marcado como Activo` : `🔴 ${p.name} marcado como Agotado`);
  }

  function handleQuickTogglePopular(p: Product) {
    const nextState = !p.popular;
    togglePopular(p.id, nextState, staticProducts);
    refresh();
    showToast(nextState ? `⭐ ${p.name} añadido a Destacados` : `Quitar ${p.name} de Destacados`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("El nombre del producto es requerido");
      setActiveTab("general");
      return;
    }

    const parsedPrices: Record<Currency, number> = { PEN: 0, MXN: 0, COP: 0 };
    for (const c of ALL_CURRENCIES) {
      const v = parseFloat(form.prices[c]);
      if (isNaN(v) || v < 0) {
        setError(`Por favor ingresa un precio válido para ${c}`);
        setActiveTab("precios");
        return;
      }
      parsedPrices[c] = v;
    }

    if (parsedPrices.PEN === 0 && parsedPrices.MXN === 0 && parsedPrices.COP === 0) {
      setError("Debes ingresar al menos el precio en Soles (PEN)");
      setActiveTab("precios");
      return;
    }

    const parsedOriginals: Partial<Record<Currency, number>> = {};
    if (form.hasDiscount) {
      for (const c of ALL_CURRENCIES) {
        const v = form.originalPrices[c].trim();
        if (v) {
          const n = parseFloat(v);
          if (!isNaN(n) && n > 0) parsedOriginals[c] = n;
        }
      }
    }

    const parsedPhysicals: Partial<Record<Currency, number>> = {};
    if (form.hasPhysical) {
      for (const c of ALL_CURRENCIES) {
        const v = form.physicalPrices[c].trim();
        if (v) {
          const n = parseFloat(v);
          if (!isNaN(n) && n > 0) parsedPhysicals[c] = n;
        }
      }
    }

    setSaving(true);
    setTimeout(() => {
      const isEdit = !!editingProduct;
      const product: Product = {
        id: editingProduct ? editingProduct.id : generateCustomId(),
        slug: form.slug || generateSlug(form.name),
        name: form.name.trim(),
        category: form.category,
        rarity: form.rarity,
        prices: parsedPrices as Product["prices"],
        originalPrices: Object.keys(parsedOriginals).length > 0 ? (parsedOriginals as Product["originalPrices"]) : undefined,
        physicalPrices: Object.keys(parsedPhysicals).length > 0 ? (parsedPhysicals as Product["physicalPrices"]) : undefined,
        shortDescription: form.shortDescription.trim() || form.name.trim(),
        description: form.description.trim() || form.shortDescription.trim() || form.name.trim(),
        emoji: form.emoji || "📦",
        gradient: RARITY_GRADIENTS[form.rarity] || RARITY_GRADIENTS.Common,
        imageUrl: form.imageUrl.trim() || undefined,
        imageData: form.imageData || undefined,
        features: form.features.filter(Boolean),
        inStock: form.inStock,
        popular: form.popular,
      };

      if (isEdit) {
        updateProduct(product);
        showToast(`✅ "${product.name}" actualizado en el catálogo`);
      } else {
        addCustomProduct(product);
        showToast(`🎉 "${product.name}" registrado con éxito`);
      }

      refresh();
      setShowModal(false);
      setEditingProduct(null);
      setForm(emptyForm);
      setSaving(false);
    }, 250);
  }

  function handleDelete() {
    if (!productToDelete) return;
    setDeleting(true);
    setTimeout(() => {
      hideProduct(productToDelete.id);
      refresh();
      showToast(`🗑️ "${productToDelete.name}" ocultado del catálogo`);
      setProductToDelete(null);
      setDeleting(false);
    }, 250);
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.shortDescription.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());

      const matchCategory = !categoryFilter || p.category === categoryFilter;

      let matchStatus = true;
      if (statusFilter === "activos") matchStatus = p.inStock;
      if (statusFilter === "agotados") matchStatus = !p.inStock;
      if (statusFilter === "destacados") matchStatus = !!p.popular;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, search, categoryFilter, statusFilter]);

  const previewImage = form.imageData || form.imageUrl;

  function renderProductRow(p: Product) {
    const preview = p.imageData || p.imageUrl;
    const stop = (e: React.MouseEvent) => e.stopPropagation();

    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full min-w-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden border border-white/10"
            style={preview ? undefined : { background: p.gradient }}
          >
            {preview ? (
              <img src={preview} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              p.emoji
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-white text-sm truncate">{p.name}</p>
              {p.popular && (
                <span className="text-amber-400 text-xs flex-shrink-0" title="Destacado">
                  ★
                </span>
              )}
              {!p.inStock && (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 flex-shrink-0">
                  Agotado
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10">
                {p.category}
              </span>
              <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                {p.rarity}
              </span>
              <span className="sm:hidden text-[11px] text-white/50 truncate">
                {formatCurrency(p.prices.PEN, "PEN")} · {formatCurrency(p.prices.MXN, "MXN")} ·{" "}
                {formatCurrency(p.prices.COP, "COP")}
              </span>
            </div>
          </div>

          <div className="hidden sm:block text-right flex-shrink-0 pl-2">
            <p className="font-bold text-accent text-sm leading-tight">{formatCurrency(p.prices.PEN, "PEN")}</p>
            <p className="text-[11px] text-white/40">
              {formatCurrency(p.prices.MXN, "MXN")} · {formatCurrency(p.prices.COP, "COP")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={stop}>
          <button
            onClick={() => handleQuickToggleStock(p)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
              p.inStock
                ? "bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25"
                : "bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25"
            }`}
            title="Clic para cambiar estado de stock al instante"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${p.inStock ? "bg-green-400" : "bg-red-400"}`} />
            <span>{p.inStock ? "Activo" : "Agotado"}</span>
          </button>

          <button
            onClick={() => handleQuickTogglePopular(p)}
            className={`p-1.5 rounded-lg transition-colors ${
              p.popular
                ? "text-amber-400 bg-amber-400/10 hover:bg-amber-400/20"
                : "text-white/20 hover:text-amber-400/60 hover:bg-white/5"
            }`}
            title={p.popular ? "Quitar de destacados" : "Marcar como destacado (Popular)"}
          >
            <span className="text-sm leading-none">★</span>
          </button>

          <button
            onClick={() => openEdit(p)}
            className="text-white/40 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
            title="Editar detalles del producto"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>

          <button
            onClick={() => setProductToDelete(p)}
            className="text-white/40 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
            title="Eliminar producto"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast flotante de retroalimentación */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-scene-900 border border-accent/40 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in-up glow-red">
          <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
          <p className="text-xs sm:text-sm font-medium">{toastMessage}</p>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-medium mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Catálogo en Tiempo Real
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Gestión de Productos
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-0.5">
            Crea, edita y cambia el stock de tus ítems. Los cambios se sincronizan en vivo con el catálogo público.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-light text-white px-5 py-2.5 rounded-full font-semibold text-xs sm:text-sm transition-all active:scale-95 glow-red shadow-lg shadow-accent/20 flex-shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* TARJETAS DE MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-scene-900/80 border border-white/5 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-xl flex-shrink-0">
            📦
          </div>
          <div>
            <p className="text-white/40 text-[11px] uppercase tracking-wider font-medium">Total Productos</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">{stats.total}</p>
          </div>
        </div>

        <div className="bg-scene-900/80 border border-green-500/10 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center text-xl flex-shrink-0">
            🟢
          </div>
          <div>
            <p className="text-green-400/70 text-[11px] uppercase tracking-wider font-medium">En Stock</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">{stats.activos}</p>
          </div>
        </div>

        <div className="bg-scene-900/80 border border-red-500/10 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center text-xl flex-shrink-0">
            🔴
          </div>
          <div>
            <p className="text-red-400/70 text-[11px] uppercase tracking-wider font-medium">Agotados</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">{stats.agotados}</p>
          </div>
        </div>

        <div className="bg-scene-900/80 border border-amber-500/10 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-xl flex-shrink-0">
            ⭐
          </div>
          <div>
            <p className="text-amber-400/70 text-[11px] uppercase tracking-wider font-medium">Destacados</p>
            <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">{stats.destacados}</p>
          </div>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS INTELIGENTES */}
      <div className="bg-scene-900/70 border border-white/5 rounded-2xl p-3.5 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Input de Búsqueda */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
              width="16"
              height="16"
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
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, categoría o descripción..."
              className="w-full bg-scene-950 border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-accent transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro por Categoría */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-scene-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-accent transition-colors md:w-56"
          >
            <option value="">Todas las categorías</option>
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Píldoras de Filtro Rápido por Estado */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-white/40 text-[11px] mr-1 hidden sm:inline">Filtrar:</span>
            <button
              onClick={() => setStatusFilter("todos")}
              className={`px-3 py-1 rounded-full font-medium transition-colors ${
                statusFilter === "todos"
                  ? "bg-white text-black font-semibold"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              Todos ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter("activos")}
              className={`px-3 py-1 rounded-full font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === "activos"
                  ? "bg-green-500 text-black font-semibold"
                  : "bg-white/5 text-green-400/80 hover:bg-white/10"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              Activos ({stats.activos})
            </button>
            <button
              onClick={() => setStatusFilter("agotados")}
              className={`px-3 py-1 rounded-full font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === "agotados"
                  ? "bg-red-500 text-white font-semibold"
                  : "bg-white/5 text-red-400/80 hover:bg-white/10"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Agotados ({stats.agotados})
            </button>
            <button
              onClick={() => setStatusFilter("destacados")}
              className={`px-3 py-1 rounded-full font-medium transition-colors flex items-center gap-1.5 ${
                statusFilter === "destacados"
                  ? "bg-amber-400 text-black font-semibold"
                  : "bg-white/5 text-amber-300/80 hover:bg-white/10"
              }`}
            >
              ⭐ Destacados ({stats.destacados})
            </button>
          </div>

          <p className="text-[11px] text-white/40">
            Mostrando <span className="text-white font-medium">{filtered.length}</span> resultados
          </p>
        </div>
      </div>

      {/* LISTA / TABLA DE PRODUCTOS */}
      {filtered.length === 0 ? (
        <div className="bg-scene-900/60 border border-white/5 rounded-3xl p-12 text-center">
          <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">
            🔍
          </div>
          <p className="text-white font-semibold text-base mb-1">No se encontraron productos</p>
          <p className="text-white/40 text-xs sm:text-sm max-w-sm mx-auto mb-4">
            No hay productos que coincidan con los filtros seleccionados. Prueba a limpiar la búsqueda o agrega uno nuevo.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setCategoryFilter("");
              setStatusFilter("todos");
            }}
            className="text-xs text-accent hover:underline font-medium"
          >
            Limpiar todos los filtros
          </button>
        </div>
      ) : (
        <AnimatedList
          items={filtered}
          animation="pop"
          stagger={0.05}
          theme="dark"
          width="100%"
          maxHeight="min(72vh, 780px)"
          radius={16}
          gap={10}
          onItemSelect={(p) => openEdit(p)}
          renderItem={(p) => renderProductRow(p)}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL REDISEÑADO: CREACIÓN / EDICIÓN SIMPLE Y VISUAL         */}
      {/* ============================================================ */}
      {showModal && (
        <Modal onClose={closeModal}>
          <div className="space-y-5">
            {/* Cabecera del Modal */}
            <div className="border-b border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2
                    className="text-2xl font-bold text-white tracking-tight"
                    style={{ fontFamily: "var(--font-cormorant)" }}
                  >
                    {editingProduct ? `Editar "${editingProduct.name}"` : "Nuevo Producto en Catálogo"}
                  </h2>
                  <p className="text-xs text-white/40 mt-0.5">
                    {editingProduct
                      ? "Modifica precios, descripción o imágenes. Se actualizará en el catálogo público de inmediato."
                      : "Registra un nuevo ítem con cálculo automático de divisas y vista previa en tiempo real."}
                  </p>
                </div>
              </div>

              {/* Pestañas de Navegación del Formulario */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("general")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "general"
                      ? "bg-accent text-white glow-red"
                      : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  📝 1. Información General
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("precios")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "precios"
                      ? "bg-accent text-white glow-red"
                      : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  💰 2. Precios & Ofertas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("multimedia")}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === "multimedia"
                      ? "bg-accent text-white glow-red"
                      : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  🎨 3. Imagen & Opciones
                </button>
              </div>
            </div>

            {/* CUERPO: Formulario a la izquierda + Live Preview a la derecha */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* COLUMNA IZQUIERDA: PESTAÑAS ACTIVAS (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* PESTAÑA 1: GENERAL */}
                  {activeTab === "general" && (
                    <div className="space-y-4 animate-fade-in-up">
                      <div>
                        <label className="label-base">Nombre del Producto *</label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="Ej: Fruta Dragón Mítica"
                          className="input-base"
                        />
                        <p className="text-[11px] text-white/30 mt-1">
                          Slug URL generado: <span className="text-white/60 font-mono">/productos/{form.slug || "nombre-del-producto"}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="label-base">Categoría *</label>
                          <select
                            value={form.category}
                            onChange={(e) => updateField("category", e.target.value as Category)}
                            className="input-base"
                          >
                            {ALL_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="label-base">Rareza *</label>
                          <select
                            value={form.rarity}
                            onChange={(e) => updateField("rarity", e.target.value as Rarity | "Servicio" | "Gamepass")}
                            className="input-base"
                          >
                            {ALL_RARITIES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Emojis sugeridos con 1 clic */}
                      <div>
                        <label className="label-base">Emoji Representativo</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={form.emoji}
                            onChange={(e) => updateField("emoji", e.target.value)}
                            className="w-14 h-11 text-center text-xl bg-scene-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-accent"
                            maxLength={2}
                          />
                          <div className="flex flex-wrap items-center gap-1.5 flex-1">
                            {SUGGESTED_EMOJIS.map((s) => (
                              <button
                                key={s.emoji}
                                type="button"
                                onClick={() => updateField("emoji", s.emoji)}
                                className={`px-2 py-1 rounded-lg text-sm transition-all ${
                                  form.emoji === s.emoji
                                    ? "bg-accent/20 border border-accent/40 scale-105"
                                    : "bg-white/5 hover:bg-white/10 border border-white/5"
                                }`}
                                title={s.label}
                              >
                                {s.emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="label-base">Descripción Corta *</label>
                        <input
                          type="text"
                          required
                          value={form.shortDescription}
                          onChange={(e) => updateField("shortDescription", e.target.value)}
                          placeholder="Resumen atractivo en 1 línea para las tarjetas"
                          className="input-base"
                        />
                      </div>

                      <div>
                        <label className="label-base">Descripción Detallada (Opcional)</label>
                        <textarea
                          rows={2}
                          value={form.description}
                          onChange={(e) => updateField("description", e.target.value)}
                          placeholder="Detalles sobre entrega, estadísticas en Blox Fruits, requisitos..."
                          className="input-base resize-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab("precios")}
                        className="w-full bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span>Siguiente: Configurar Precios & Ofertas</span>
                        <span>→</span>
                      </button>
                    </div>
                  )}

                  {/* PESTAÑA 2: PRECIOS */}
                  {activeTab === "precios" && (
                    <div className="space-y-4 animate-fade-in-up">
                      <div className="bg-accent/10 border border-accent/30 rounded-2xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-white font-semibold flex items-center gap-1.5">
                            <span>✨</span>
                            <span>Asistente de Auto-Conversión de Monedas</span>
                          </p>
                          <button
                            type="button"
                            onClick={handleAutoConvertCurrencies}
                            className="bg-accent hover:bg-accent-light text-white px-3 py-1 rounded-lg text-xs font-semibold transition-all glow-red"
                          >
                            Auto-calcular
                          </button>
                        </div>
                        <p className="text-[11px] text-white/60">
                          Ingresa el precio en <strong>Soles (PEN)</strong> y presiona auto-calcular para rellenar instantáneamente Pesos Mexicanos (MXN) y Pesos Colombianos (COP).
                        </p>
                      </div>

                      {/* Inputs de Precios por Moneda */}
                      <div>
                        <label className="label-base">Precios de Venta *</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {ALL_CURRENCIES.map((c) => (
                            <div key={c} className="bg-scene-950 border border-white/10 rounded-xl p-2.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-white/70 flex items-center gap-1">
                                  <span>{CURRENCY_FLAGS[c]}</span>
                                  <span>{c}</span>
                                </span>
                                <span className="text-[10px] text-white/40">{CURRENCY_LABELS[c]}</span>
                              </div>
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={form.prices[c]}
                                onChange={(e) => updatePrice(c, e.target.value)}
                                placeholder="0"
                                className="w-full bg-transparent text-sm font-bold text-white focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Atajos de Descuento */}
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <label className="label-base">¿Tiene Descuento / Oferta?</label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {[
                            { label: "Sin oferta", val: 0 },
                            { label: "-10%", val: 10 },
                            { label: "-20%", val: 20 },
                            { label: "-30%", val: 30 },
                            { label: "-50%", val: 50 },
                          ].map((item) => (
                            <button
                              key={item.val}
                              type="button"
                              onClick={() => applyDiscountPercent(item.val)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                form.discountPercent === item.val
                                  ? "bg-red-500 text-white glow-red"
                                  : "bg-white/5 text-white/70 hover:bg-white/10"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>

                        {form.hasDiscount && (
                          <div className="grid grid-cols-3 gap-2.5 pt-2">
                            {ALL_CURRENCIES.map((c) => (
                              <div key={c} className="bg-scene-950/60 border border-white/5 rounded-xl p-2">
                                <span className="text-[10px] text-white/40 block mb-1">Precio Original ({c})</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={form.originalPrices[c]}
                                  onChange={(e) => updateOriginalPrice(c, e.target.value)}
                                  className="w-full bg-transparent text-xs text-white/70 line-through focus:outline-none"
                                  placeholder="0"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Precios Físicos (Opcional) */}
                      <div className="pt-2 border-t border-white/5 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.hasPhysical}
                            onChange={(e) => updateField("hasPhysical", e.target.checked)}
                            className="w-4 h-4 rounded accent-accent"
                          />
                          <span className="text-xs text-white/80 font-medium">
                            Ofrecer opción de fruta física / tradeable
                          </span>
                        </label>

                        {form.hasPhysical && (
                          <div className="grid grid-cols-3 gap-2.5 pt-1">
                            {ALL_CURRENCIES.map((c) => (
                              <div key={c} className="bg-scene-950 border border-white/10 rounded-xl p-2">
                                <span className="text-[10px] text-white/40 block mb-1">Físico ({c})</span>
                                <input
                                  type="number"
                                  min={0}
                                  value={form.physicalPrices[c]}
                                  onChange={(e) => updatePhysicalPrice(c, e.target.value)}
                                  className="w-full bg-transparent text-xs text-white focus:outline-none"
                                  placeholder="0"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab("multimedia")}
                        className="w-full bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span>Siguiente: Imagen & Opciones</span>
                        <span>→</span>
                      </button>
                    </div>
                  )}

                  {/* PESTAÑA 3: MULTIMEDIA & OPCIONES */}
                  {activeTab === "multimedia" && (
                    <div className="space-y-4 animate-fade-in-up">
                      {/* Imagen */}
                      <div>
                        <label className="label-base">Imagen del Producto</label>
                        <div className="bg-scene-950 border border-white/10 rounded-2xl p-4 space-y-3">
                          {previewImage ? (
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                                <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-white font-medium truncate">Imagen lista</p>
                                <p className="text-[10px] text-white/40">
                                  {form.imageData ? "Archivo local subido" : "Enlace web externo"}
                                </p>
                                <button
                                  type="button"
                                  onClick={clearImage}
                                  className="text-[11px] text-red-400 hover:underline mt-1 font-medium"
                                >
                                  Quitar imagen
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept="image/*"
                                  onChange={handleFileUpload}
                                  className="block w-full text-xs text-white/60 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30 file:cursor-pointer cursor-pointer"
                                />
                                <p className="text-[10px] text-white/30 mt-1">PNG, JPG, WEBP (hasta 1.5 MB)</p>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-[10px] text-white/40 uppercase tracking-wider">o pegar URL</span>
                                <div className="flex-1 h-px bg-white/10" />
                              </div>

                              <input
                                type="url"
                                value={form.imageUrl}
                                onChange={(e) => updateField("imageUrl", e.target.value)}
                                placeholder="https://ejemplo.com/imagen.png"
                                className="input-base text-xs"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Características / Tags */}
                      <div>
                        <label className="label-base">Características Destacadas</label>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={form.newFeatureInput}
                              onChange={(e) => updateField("newFeatureInput", e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddFeature();
                                }
                              }}
                              placeholder="Ej: Transformación V2, Gran daño PvP..."
                              className="input-base text-xs flex-1"
                            />
                            <button
                              type="button"
                              onClick={handleAddFeature}
                              className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                            >
                              + Añadir
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {form.features.map((feat, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-white/80"
                              >
                                <span>{feat}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFeature(idx)}
                                  className="text-white/40 hover:text-red-400"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Opciones de Estado */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-scene-950 border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
                          <input
                            type="checkbox"
                            checked={form.inStock}
                            onChange={(e) => updateField("inStock", e.target.checked)}
                            className="w-4 h-4 rounded accent-accent"
                          />
                          <div>
                            <span className="text-xs text-white font-medium block">En Stock</span>
                            <span className="text-[10px] text-white/40">Disponible para compra</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2.5 p-3 rounded-xl bg-scene-950 border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
                          <input
                            type="checkbox"
                            checked={form.popular}
                            onChange={(e) => updateField("popular", e.target.checked)}
                            className="w-4 h-4 rounded accent-accent"
                          />
                          <div>
                            <span className="text-xs text-white font-medium block">Destacado</span>
                            <span className="text-[10px] text-white/40">Aparece en inicio</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* COLUMNA DERECHA: LIVE CARD PREVIEW EN TIEMPO REAL (5 cols) */}
                <div className="lg:col-span-5 bg-scene-950/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                        Vista Previa en Vivo
                      </span>
                      <span className="text-[10px] text-white/40">Catálogo público</span>
                    </div>

                    {/* Tarjeta simulada de Blox Fruits idéntica a la tienda */}
                    <div className="bg-scene-800 rounded-2xl overflow-hidden border border-white/10 max-w-[260px] mx-auto shadow-2xl">
                      <div className="relative aspect-square overflow-hidden">
                        {previewImage ? (
                          <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-5xl"
                            style={{
                              background: RARITY_GRADIENTS[form.rarity] || RARITY_GRADIENTS.Common,
                            }}
                          >
                            {form.emoji || "📦"}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                        {form.hasDiscount && form.discountPercent > 0 && (
                          <div className="absolute top-2 right-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white">
                              -{form.discountPercent}%
                            </span>
                          </div>
                        )}

                        {form.popular && (
                          <div className="absolute top-2 left-2">
                            <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-accent text-white glow-red">
                              Popular
                            </span>
                          </div>
                        )}

                        {!form.inStock && (
                          <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-red-500/80 text-white">
                              Agotado
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-3">
                        <h3
                          className="text-white text-sm font-semibold leading-tight mb-1 truncate"
                          style={{ fontFamily: "var(--font-cormorant)" }}
                        >
                          {form.name || "Nombre del Producto"}
                        </h3>
                        <p className="text-[11px] text-white/40 line-clamp-1 mb-2">
                          {form.shortDescription || "Descripción breve del producto..."}
                        </p>

                        <div className="flex items-center gap-2">
                          <span className="text-accent font-bold text-sm">
                            {form.prices.PEN ? `S/ ${form.prices.PEN}` : "S/ 0"}
                          </span>
                          {form.hasDiscount && form.originalPrices.PEN && (
                            <span className="text-white/30 text-[10px] line-through">
                              S/ {form.originalPrices.PEN}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center pt-2 border-t border-white/5">
                    <p className="text-[11px] text-white/40">
                      Así es exactamente como tus clientes verán este ítem en la tienda.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mensajes de Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="flex gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 bg-white/5 text-white/60 py-3 rounded-full font-medium text-xs sm:text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-accent hover:bg-accent-light text-white py-3 rounded-full font-semibold text-xs sm:text-sm transition-all disabled:opacity-50 glow-red shadow-lg shadow-accent/20"
                >
                  {saving
                    ? "Guardando cambios..."
                    : editingProduct
                    ? "Guardar Cambios"
                    : "Publicar en Catálogo"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {productToDelete && (
        <Modal onClose={() => !deleting && setProductToDelete(null)} small>
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20 text-red-400 text-xl">
            🗑️
          </div>
          <h3
            className="text-lg font-bold text-white text-center mb-2"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Eliminar del Catálogo
          </h3>
          <p className="text-white/60 text-xs sm:text-sm text-center mb-6 leading-relaxed">
            ¿Deseas ocultar <span className="text-white font-semibold">"{productToDelete.name}"</span>? Dejará de ser visible y accesible para los compradores en el catálogo público.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setProductToDelete(null)}
              disabled={deleting}
              className="flex-1 bg-white/5 text-white/60 py-2.5 rounded-full font-medium text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-full font-semibold text-xs transition-colors disabled:opacity-50 shadow-lg shadow-red-500/20"
            >
              {deleting ? "Eliminando..." : "Confirmar Eliminación"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  children,
  onClose,
  small,
}: {
  children: React.ReactNode;
  onClose: () => void;
  small?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-scene-900 border border-white/10 rounded-3xl ${
          small ? "w-full max-w-sm p-6" : "w-full max-w-4xl p-6 sm:p-7 max-h-[92vh] overflow-y-auto"
        } shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "fade-in-up 0.25s ease-out" }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
          aria-label="Cerrar modal"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}
