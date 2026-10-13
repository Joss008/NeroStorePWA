"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminLogout } from "@/lib/admin";
import "./Dock.css";

const HOP = 0.4;
const HOP_TIME = 0.38;

type IconProps = { className?: string };

const IconDashboard = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

const IconOrders = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <path d="M9 12h6M9 16h4" />
  </svg>
);

const IconProducts = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="M3.3 7 12 12l8.7-5M12 22V12" />
  </svg>
);

const IconCatalog = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const IconLogout = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

interface DockItemData {
  icon: React.ReactNode;
  label: string;
  path?: string;
  href?: string;
  onClick?: () => void;
  badge?: number;
  showDot?: boolean;
  separatorBefore?: boolean;
}

function useVerticalDockMotion(
  rootRef: React.RefObject<HTMLDivElement | null>,
  itemRefs: React.RefObject<(HTMLElement | null)[]>,
  count: number,
  base: number,
  peak: number,
  gap: number,
  distance: number,
  bounce: boolean
) {
  const baseRef = useRef(base);
  baseRef.current = base;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const motion = new Map<number, { size: number; velocity: number }>();
    const pointer = { y: 0, inside: false };
    let raf = 0;
    let last = 0;
    let alive = true;

    const spring = { mass: 0.1, stiffness: 160, damping: 13 };

    const entry = (index: number) => {
      let state = motion.get(index);
      if (!state) {
        state = { size: base, velocity: 0 };
        motion.set(index, state);
      }
      return state;
    };

    const tick = (now: number) => {
      raf = 0;
      if (!alive) return;
      const dt = Math.min(1 / 30, Math.max(0.001, (now - last) / 1000));
      last = now;
      const rect = root.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      let cursor = -((count * base + gap * (count - 1)) / 2);
      const rest: number[] = [];
      for (let i = 0; i < count; i++) {
        rest.push(cursor + base / 2);
        cursor += base + gap;
      }
      const focus = pointer.inside ? pointer.y - centerY : null;
      const steps = Math.max(1, Math.ceil(dt * 240));
      const h = dt / steps;
      const k = spring.stiffness / spring.mass;
      const c = spring.damping / spring.mass;
      let moving = false;

      for (let index = 0; index < count; index++) {
        const node = itemRefs.current?.[index];
        if (!node) continue;
        const state = entry(index);
        const reach = focus === null ? 1 : Math.abs(focus - rest[index]) / distance;
        const falloff = reach < 1 ? Math.cos((reach * Math.PI) / 2) ** 2 : 0;
        const target = base + (peak - base) * falloff;
        if (reduce) {
          state.size = target;
          state.velocity = 0;
        } else {
          for (let i = 0; i < steps; i++) {
            state.velocity = (state.velocity + h * k * (target - state.size)) / (1 + h * c + h * h * k);
            state.size += state.velocity * h;
          }
        }
        if (Math.abs(state.velocity) < 0.01 && Math.abs(target - state.size) < 0.01) {
          state.size = target;
          state.velocity = 0;
        } else {
          moving = true;
        }

        const size = Math.max(1, state.size);
        const ratio = size / base;
        const glow = Math.max(0, Math.min(1, (size - base) / (peak - base)));

        const face = node.querySelector(".dock-face") as HTMLElement | null;
        if (face) {
          face.style.transform = `scale(${ratio}) translateX(${glow * 3}px)`;
        }
        const glowEl = node.querySelector(".dock-glow") as HTMLElement | null;
        if (glowEl) {
          glowEl.style.opacity = String(glow * 0.55);
        }
      }

      if (moving) raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      pointer.y = event.clientY;
      pointer.inside = true;
      wake();
    };
    const onLeave = () => {
      pointer.inside = false;
      wake();
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    wake();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [count, base, peak, gap, distance, rootRef, itemRefs]);

  const hop = useCallback(
    (index: number) => {
      const node = itemRefs.current?.[index];
      if (!node) return;
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      if (!bounce) return;
      const height = baseRef.current * HOP;
      node.animate(
        [
          { transform: "translateX(0)" },
          { transform: `translateX(${height}px)`, offset: 0.4 },
          { transform: "translateX(0)" },
        ],
        { duration: HOP_TIME * 1000, easing: "cubic-bezier(0.28, 0.84, 0.42, 1)" }
      );
    },
    [bounce, itemRefs]
  );

  return { hop };
}

interface AdminDockProps {
  onNavigate?: () => void;
}

export default function AdminDock({ onNavigate }: AdminDockProps) {
  const pathname = usePathname();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);

  const base = 44;
  const peak = 62;
  const gap = 6;
  const distance = 130;

  const items: DockItemData[] = [
    { icon: <IconDashboard />, label: "Dashboard", path: "/dashboard", showDot: pathname === "/dashboard" },
    { icon: <IconOrders />, label: "Pedidos", path: "/pedidos", showDot: pathname === "/pedidos" },
    { icon: <IconProducts />, label: "Productos", path: "/productos", showDot: pathname === "/productos" },
    { separatorBefore: true, icon: null, label: "" },
    { icon: <IconCatalog />, label: "Catálogo", href: process.env.NEXT_PUBLIC_CATALOG_URL || "#" },
    {
      icon: <IconLogout />,
      label: "Salir",
      onClick: () => {
        adminLogout();
        router.push("/login");
        router.refresh();
      },
    },
  ];

  const realCount = items.filter((i) => !i.separatorBefore || i.icon).length;
  const { hop } = useVerticalDockMotion(rootRef, itemRefs, realCount, base, peak, gap, distance, true);

  let realIndex = -1;

  return (
    <div
      ref={rootRef}
      className="dock dock--left"
      role="toolbar"
      aria-label="Navegación principal"
    >
      {items.map((item, i) => {
        if (item.separatorBefore && !item.icon) {
          return <span key={`sep-${i}`} className="dock-separator" aria-hidden="true" />;
        }

        realIndex += 1;
        const idx = realIndex;

        const inner = (
          <>
            <span className="dock-glow" aria-hidden="true" />
            <span className="dock-tile">
              <span className="dock-face">{item.icon}</span>
              {item.badge !== undefined && <span className="dock-badge">{item.badge}</span>}
            </span>
            {item.showDot && <span className="dock-dot" aria-hidden="true" />}
            {hovered === idx && <span className="dock-label">{item.label}</span>}
          </>
        );

        const handlers = {
          ref: (node: HTMLElement | null) => { itemRefs.current[idx] = node; },
          className: "dock-item",
          "aria-label": item.label,
          onPointerEnter: () => setHovered(idx),
          onPointerLeave: () => setHovered(null),
        };

        if (item.path) {
          return (
            <Link key={item.path} href={item.path} {...handlers} aria-current={item.showDot ? "page" : undefined} onClick={() => { hop(idx); onNavigate?.(); }}>
              {inner}
            </Link>
          );
        }

        if (item.href) {
          return (
            <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" {...handlers} onClick={() => hop(idx)}>
              {inner}
            </a>
          );
        }

        return (
          <button key={item.label} type="button" {...handlers} onClick={() => { hop(idx); item.onClick?.(); onNavigate?.(); }}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
