"use client";

const ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";

const SESSION_KEY = "blox-admin-auth";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 8; // 8 hours

export function adminLogin(password: string): { ok: boolean; error?: string } {
  if (password === ADMIN_PASSWORD) {
    const expires = Date.now() + SESSION_DURATION_MS;
    if (typeof window !== "undefined") {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ ok: true, expires })
      );
    }
    return { ok: true };
  }
  return { ok: false, error: "Contraseña incorrecta" };
}

export function adminLogout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return false;
    const session = JSON.parse(data);
    if (!session.expires) return false;
    if (Date.now() > session.expires) {
      localStorage.removeItem(SESSION_KEY);
      return false;
    }
    return session.ok === true;
  } catch {
    return false;
  }
}