"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { adminLogin, isAdminAuthenticated } from "@/lib/admin";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated()) {
      router.push("/dashboard");
    }
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password) {
      setError("Ingresa la contraseña");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const result = adminLogin(password);
      if (result.ok) {
        router.push("/dashboard");
      } else {
        setError(result.error || "Error de autenticación");
        setSubmitting(false);
      }
    }, 400);
  }

  return (
    <div className="min-h-screen bg-scene-950 bg-grid flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Link href="/dashboard" className="inline-flex items-center gap-2 mb-8 group">
          <img src="/admin/logo.png" alt="PWA Blox" className="h-[78px] w-auto" />
        </Link>

        <div
          className="bg-scene-900 border border-white/10 rounded-2xl p-8 glow-red"
          style={{ animation: "fade-in-up 0.3s ease-out" }}
        >
          <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">🔐</span>
          </div>
          <h1
            className="text-2xl font-bold text-white text-center mb-2"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Acceso Administrativo
          </h1>
          <p className="text-white/40 text-xs text-center mb-6">
            Ingresa la contraseña para continuar
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-base">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="••••••••"
                className="input-base"
                autoFocus
              />
              {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-accent text-white py-3 rounded-full font-semibold text-sm hover:bg-accent-light transition-colors disabled:opacity-50 glow-red"
            >
              {submitting ? "Verificando..." : "Ingresar"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="text-white/30 text-xs text-center">
              Sesión expira en 8 horas. Por seguridad, no compartas la contraseña.
            </p>
          </div>
        </div>

        <p className="text-center mt-6 text-white/30 text-xs">
          Esta PWA alimenta el catálogo público en tiempo real.
        </p>
      </div>
    </div>
  );
}
