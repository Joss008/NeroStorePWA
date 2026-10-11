"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminLogout } from "@/lib/admin";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: "📊" },
  { path: "/pedidos", label: "Pedidos", icon: "📋" },
  { path: "/productos", label: "Productos", icon: "📦" },
];

interface Props {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ mobileOpen = false, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen && onClose) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function handleLogout() {
    adminLogout();
    setConfirmLogout(false);
    router.push("/login");
    router.refresh();
  }

  const content = (
    <>
      <Link
        href="/dashboard"
        className="mb-6 sm:mb-8 flex items-center gap-2 group"
        onClick={onClose}
      >
        <img src="/admin/logo.png" alt="PWA Blox" className="h-[67px] w-auto" />
      </Link>

      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? "bg-accent/15 text-accent font-medium border border-accent/20"
                  : "text-white/50 hover:bg-white/5 hover:text-white border border-transparent"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-white/5 space-y-2">
        <a
          href={process.env.NEXT_PUBLIC_CATALOG_URL || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:bg-white/5 hover:text-white transition-all"
        >
          <span className="text-base">🏠</span>
          Ver Catálogo Público
        </a>

        {confirmLogout ? (
          <div className="bg-scene-800 border border-white/10 rounded-lg p-3 space-y-2">
            <p className="text-xs text-white/70">¿Cerrar sesión?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 bg-scene-700 text-white/60 py-1.5 rounded-md text-xs hover:bg-scene-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-500/20 text-red-400 py-1.5 rounded-md text-xs hover:bg-red-500/30 transition-colors font-medium"
              >
                Salir
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmLogout(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:bg-white/5 hover:text-red-400 transition-all"
          >
            <span className="text-base">🚪</span>
            Cerrar Sesión
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex w-64 bg-scene-900 border-r border-white/5 p-4 flex-col min-h-screen sticky top-0 self-start">
        {content}
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <aside className="relative w-72 max-w-[85vw] bg-scene-900 border-r border-white/5 p-4 flex flex-col h-full overflow-y-auto">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
              aria-label="Cerrar menú"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}