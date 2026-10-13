"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import AdminDock from "@/components/Dock";
import { isAdminAuthenticated } from "@/lib/admin";

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<boolean | null>(null);

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
    <div className="min-h-screen bg-scene-950 bg-grid flex flex-col">
      <header className="sticky top-0 z-40 bg-scene-900/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 max-w-5xl mx-auto w-full">
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
          <a
            href={process.env.NEXT_PUBLIC_CATALOG_URL || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-white text-xs"
          >
            Catálogo ↗
          </a>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 md:p-8 pb-28 max-w-5xl mx-auto w-full overflow-auto">{children}</main>
      <AdminDock />
    </div>
  );
}