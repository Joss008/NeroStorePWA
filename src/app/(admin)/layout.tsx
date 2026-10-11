"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { isAdminAuthenticated } from "@/lib/admin";

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (pathname === "/login") {
      setAuth(true);
      return;
    }
    const ok = isAdminAuthenticated();
    setAuth(ok);
    if (!ok) router.push("/login");
  }, [pathname, router]);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (auth === null || auth === false) {
    return (
      <div className="min-h-screen bg-scene-950 flex items-center justify-center">
        <div className="text-white/40 text-sm">Verificando acceso...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-scene-950 bg-grid">
      <AdminSidebar
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 min-w-0">
        <header className="md:hidden sticky top-0 z-40 bg-scene-900/90 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-4 h-14">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-white/70 hover:text-white p-2 -ml-2"
              aria-label="Abrir menú"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-xs glow-red">
                BF
              </span>
              <span
                className="text-sm font-bold text-white"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                PWA Blox
              </span>
            </Link>
            <span className="w-9 h-9" aria-hidden />
          </div>
        </header>
        <main className="p-4 sm:p-6 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}