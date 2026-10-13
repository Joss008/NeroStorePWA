"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminLogout } from "@/lib/admin";
import "./Dock.css";

const EDGE = 12;
const HOP = 0.4;
const HOP_TIME = 0.38;

interface DockItem {
  icon: string;
  label: string;
  path?: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

type DockNode = HTMLButtonElement | HTMLAnchorElement;

function useDockMotion(
  rootRef: React.RefObject<HTMLDivElement | null>,
  itemRefs: React.RefObject<(DockNode | null)[]>,
  count: number,
  base: number,
  peak: number,
  gap: number,
  distance: number,
  spring: { mass: number; stiffness: number; damping: number },
  bounce: boolean
) {
  const wakeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const motion = new Map<number, { size: number; velocity: number; lift: number; rise: number; launch: number; gravity: number; hopping: boolean; drawn: string }>();
    const pointer = { x: 0, y: 0, inside: false };
    let lastRest: number[] = [];
    let raf = 0;
    let last = 0;
    let alive = true;

    const entry = (index: number) => {
      let state = motion.get(index);
      if (!state) {
        state = { size: base, velocity: 0, lift: 0, rise: 0, launch: 0, gravity: 0, hopping: false, drawn: "" };
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
      const center = rect.left + rect.width / 2;
      const spans = new Array(count).fill(base);
      let cursor = -(spans.reduce((s, v) => s + v, 0) + gap * Math.max(0, count - 1)) / 2;
      const rest = spans.map((span) => {
        const mid = cursor + span / 2;
        cursor += span + gap;
        return mid;
      });
      lastRest = rest;
      const focus = pointer.inside ? pointer.x - center : null;
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
        const target = base + (peak - base) * (reach < 1 ? Math.cos((reach * Math.PI) / 2) ** 2 : 0);
        if (reduce) {
          state.size = target;
          state.velocity = 0;
        } else {
          for (let i = 0; i < steps; i++) {
            state.velocity = (state.velocity + h * k * (target - state.size)) / (1 + h * c + h * h * k);
            state.size += state.velocity * h;
            if (!state.hopping) continue;
            state.rise -= state.gravity * h;
            state.lift += state.rise * h;
            if (state.lift > 0) continue;
            state.lift = 0;
            state.rise *= -0.36;
            if (state.rise < state.launch * 0.2) {
              state.rise = 0;
              state.hopping = false;
              node.removeAttribute("data-hop");
            }
          }
        }
        if (Math.abs(state.velocity) < 0.01 && Math.abs(target - state.size) < 0.01) {
          state.size = target;
          state.velocity = 0;
        } else {
          moving = true;
        }
        if (state.hopping) moving = true;
        const size = Math.max(1, state.size);
        const drawn = `${size.toFixed(2)} ${state.lift.toFixed(2)}`;
        if (drawn === state.drawn) continue;
        state.drawn = drawn;
        node.style.width = `${size}px`;
        node.style.height = `${size}px`;
        const tile = node.querySelector(".dock-tile") as HTMLElement | null;
        if (tile) tile.style.transform = `translate(0, ${-state.lift}px) scale(${size / base})`;
      }

      if (moving) raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (raf || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
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

    wakeRef.current = () => {
      wake();
    };

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      wakeRef.current = null;
    };
  }, [count, base, peak, gap, distance, spring.mass, spring.stiffness, spring.damping, rootRef, itemRefs]);

  const hop = useCallback(
    (index: number) => {
      const root = rootRef.current;
      const node = itemRefs.current?.[index];
      if (!root || !node) return;
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      if (!bounce) return;
      const height = parseFloat(node.style.width || "48") * HOP;
      const gravity = (8 * height) / (HOP_TIME * HOP_TIME);
      const launch = (gravity * HOP_TIME) / 2;
      node.setAttribute("data-hop", "");
      // mini spring for the hop via inline animation
      node.animate(
        [
          { transform: "translateY(0)" },
          { transform: `translateY(-${height}px)`, offset: 0.4 },
          { transform: "translateY(0)" },
        ],
        { duration: HOP_TIME * 1000, easing: "cubic-bezier(0.28, 0.84, 0.42, 1)" }
      ).onfinish = () => node.removeAttribute("data-hop");
      void launch;
    },
    [bounce, itemRefs, rootRef]
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
  const itemRefs = useRef<(DockNode | null)[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);

  const base = 44;
  const peak = 62;
  const gap = 8;
  const distance = 160;

  const { hop } = useDockMotion(rootRef, itemRefs, 4, base, peak, gap, distance, { mass: 0.1, stiffness: 150, damping: 12 }, true);

  const items: DockItem[] = [
    { icon: "📊", label: "Dashboard", path: "/dashboard" },
    { icon: "📋", label: "Pedidos", path: "/pedidos" },
    { icon: "📦", label: "Productos", path: "/productos" },
    { icon: "🚪", label: "Salir", onClick: () => { adminLogout(); router.push("/login"); router.refresh(); } },
  ];

  return (
    <div
      ref={rootRef}
      className="dock dock--bottom"
      role="toolbar"
      aria-label="Navegación principal"
      style={{ "--dock-base": `${base}px` } as React.CSSProperties}
    >
      {items.map((item, index) => {
        const isActive = item.path ? pathname === item.path : false;
        const inner = (
          <>
            <span className="dock-tile">
              <span className="dock-face">{item.icon}</span>
            </span>
            {isActive && <span className="dock-dot" aria-hidden="true" />}
            {hovered === index && <span className="dock-label">{item.label}</span>}
          </>
        );

        const btnClass = "dock-item";

        if (item.path) {
          return (
            <Link
              key={item.path}
              href={item.path}
              ref={(node) => { itemRefs.current[index] = node; }}
              className={btnClass}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              onPointerEnter={() => setHovered(index)}
              onPointerLeave={() => setHovered(null)}
              onClick={(e) => {
                hop(index);
                onNavigate?.();
                void e;
              }}
            >
              {inner}
            </Link>
          );
        }

        return (
          <button
            key={item.label}
            ref={(node) => { itemRefs.current[index] = node; }}
            type="button"
            className={btnClass}
            aria-label={item.label}
            onPointerEnter={() => setHovered(index)}
            onPointerLeave={() => setHovered(null)}
            onClick={() => {
              hop(index);
              item.onClick?.();
              onNavigate?.();
            }}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
