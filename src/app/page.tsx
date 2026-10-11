"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin";

export default function AdminIndex() {
  const router = useRouter();

  useEffect(() => {
    if (isAdminAuthenticated()) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-scene-950 flex items-center justify-center">
      <div className="text-white/40 text-sm">Cargando panel...</div>
    </div>
  );
}
