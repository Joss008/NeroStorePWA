"use client";

import { useEffect, useRef, useState } from "react";
import {
  type PaymentMethod,
  generatePaymentMethodId,
  readStoredPaymentMethods,
  writeStoredPaymentMethods,
  fetchRemotePaymentMethods,
  saveRemotePaymentMethods,
} from "@/lib/paymentMethods";

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

interface FormState {
  id: string | null;
  name: string;
  accountHolder: string;
  accountNumber: string;
  currency: string;
  imageData: string;
  enabled: boolean;
}

const emptyForm: FormState = {
  id: null,
  name: "",
  accountHolder: "",
  accountNumber: "",
  currency: "",
  imageData: "",
  enabled: true,
};

export default function MediosPagoPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<PaymentMethod | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    const cached = readStoredPaymentMethods();
    if (cached.length > 0) setMethods(cached);

    fetchRemotePaymentMethods().then((remote) => {
      if (cancelled) return;
      if (remote) {
        setMethods(remote);
        writeStoredPaymentMethods(remote);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function persist(next: PaymentMethod[]) {
    setMethods(next);
    writeStoredPaymentMethods(next);
    await saveRemotePaymentMethods(next);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen (PNG, JPG, etc).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("La imagen es muy grande (máx. 1.5 MB). Comprime la imagen e inténtalo de nuevo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setForm((prev) => ({ ...prev, imageData: result }));
        setError("");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function openEdit(m: PaymentMethod) {
    setForm({
      id: m.id,
      name: m.name,
      accountHolder: m.accountHolder || "",
      accountNumber: m.accountNumber || "",
      currency: m.currency || "",
      imageData: m.imageData || "",
      enabled: m.enabled !== false,
    });
    setError("");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("El nombre del medio de pago es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      const entry: PaymentMethod = {
        id: form.id || generatePaymentMethodId(),
        name: form.name.trim(),
        accountHolder: form.accountHolder.trim() || undefined,
        accountNumber: form.accountNumber.trim() || undefined,
        currency: form.currency || undefined,
        imageData: form.imageData || undefined,
        enabled: form.enabled,
      };
      const next = form.id
        ? methods.map((m) => (m.id === form.id ? entry : m))
        : [...methods, entry];
      await persist(next);
      setForm(emptyForm);
      setShowForm(false);
      setError("");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(m: PaymentMethod) {
    await persist(methods.map((x) => (x.id === m.id ? { ...x, enabled: x.enabled === false } : x)));
  }

  async function confirmDelete() {
    if (!toDelete) return;
    await persist(methods.filter((m) => m.id !== toDelete.id));
    setToDelete(null);
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center border border-accent/30">
          <span className="text-xl">💳</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Medios de Pago</h1>
          <p className="text-sm text-white/40">
            Configura los métodos que verán tus clientes al hacer el pedido
          </p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            setForm(emptyForm);
            setError("");
            setShowForm((v) => !v);
          }}
          className="bg-accent text-white px-5 py-2 rounded-full font-semibold text-sm hover:bg-accent-light transition-colors glow-red"
        >
          {showForm ? "Cerrar" : "+ Agregar medio de pago"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-scene-900 border border-white/5 rounded-2xl p-5 sm:p-6 mb-6 space-y-4"
          style={{ animation: "fade-in-up 0.3s ease-out" }}
        >
          <h3 className="text-base font-semibold text-white">
            {form.id ? "Editar medio de pago" : "Nuevo medio de pago"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/40 block mb-1.5">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Yape, BCP Soles, OXXO..."
                className="w-full bg-scene-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent transition-colors placeholder:text-white/20"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1.5">Moneda (opcional)</label>
              <select
                value={form.currency}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                className="w-full bg-scene-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent transition-colors"
              >
                <option value="">Sin moneda</option>
                <option value="PEN">PEN (Perú)</option>
                <option value="MXN">MXN (México)</option>
                <option value="COP">COP (Colombia)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1.5">Titular (opcional)</label>
              <input
                type="text"
                value={form.accountHolder}
                onChange={(e) => setForm((p) => ({ ...p, accountHolder: e.target.value }))}
                placeholder="Ej: Juan Pérez"
                className="w-full bg-scene-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent transition-colors placeholder:text-white/20"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1.5">
                Número de cuenta / teléfono (opcional)
              </label>
              <input
                type="text"
                value={form.accountNumber}
                onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
                placeholder="Ej: 987 654 321 o 00-11-222-333"
                className="w-full bg-scene-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-accent transition-colors placeholder:text-white/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/40 block mb-1.5">
              Imagen QR / logo (opcional, máx 1.5 MB)
            </label>
            <div className="flex items-center gap-4">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="bg-scene-950 border border-dashed border-white/20 hover:border-accent/50 rounded-xl px-4 py-3 text-xs text-white/60 hover:text-white transition-colors"
              >
                📷 {form.imageData ? "Cambiar imagen" : "Subir imagen"}
              </button>
              {form.imageData && (
                <div className="flex items-center gap-3">
                  <img
                    src={form.imageData}
                    alt="Vista previa"
                    className="w-16 h-16 rounded-lg object-contain bg-white p-1 border border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, imageData: "" }))}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
              className="accent-[var(--accent,#e11d48)]"
            />
            <span className="text-sm text-white/70">Visible para los clientes</span>
          </label>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-accent text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-accent-light transition-colors disabled:opacity-50 glow-red"
            >
              {saving ? "Guardando..." : form.id ? "Guardar cambios" : "Agregar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm);
                setError("");
              }}
              className="border border-white/20 text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {methods.length === 0 ? (
        <div className="bg-scene-900 border border-white/5 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-scene-800 flex items-center justify-center mx-auto mb-4 text-3xl">
            💳
          </div>
          <p className="text-white/60 mb-2 text-lg">No hay medios de pago configurados</p>
          <p className="text-white/40 text-sm">
            Agrega Yape, transferencias, QR u otros métodos para que tus clientes puedan pagar
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((m) => (
            <div
              key={m.id}
              className={`bg-scene-900 border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${
                m.enabled === false ? "opacity-50 border-white/5" : "border-white/5 hover:border-accent/20"
              }`}
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {m.imageData || m.imageUrl ? (
                  <img
                    src={m.imageData || m.imageUrl}
                    alt={m.name}
                    className="w-14 h-14 rounded-xl object-contain bg-white p-1 border border-white/10 flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-scene-800 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                    💳
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-white text-sm">{m.name}</p>
                    {m.currency && (
                      <span className="inline-block text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded-full bg-scene-800 text-white/60 border border-white/10">
                        {m.currency}
                      </span>
                    )}
                    {m.enabled === false && (
                      <span className="inline-block text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                        Oculto
                      </span>
                    )}
                  </div>
                  {m.accountNumber && (
                    <p className="text-xs text-white/50 font-mono truncate mt-0.5">
                      {m.accountHolder ? `${m.accountHolder} · ` : ""}
                      {m.accountNumber}
                    </p>
                  )}
                  {!m.accountNumber && m.accountHolder && (
                    <p className="text-xs text-white/50 truncate mt-0.5">{m.accountHolder}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggle(m)}
                  className="text-xs text-white/50 hover:text-white px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 transition-colors"
                >
                  {m.enabled === false ? "Mostrar" : "Ocultar"}
                </button>
                <button
                  onClick={() => openEdit(m)}
                  className="text-xs text-accent hover:underline px-2 py-1.5"
                >
                  Editar
                </button>
                <button
                  onClick={() => setToDelete(m)}
                  className="text-xs text-red-400 hover:underline px-2 py-1.5"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-scene-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Eliminar medio de pago</h3>
            <p className="text-sm text-white/60 mb-5">
              ¿Deseas eliminar <span className="text-white font-semibold">"{toDelete.name}"</span>?
              Dejará de estar disponible en el checkout.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setToDelete(null)}
                className="border border-white/20 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="bg-red-500 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
