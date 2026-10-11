const CHANNEL_NAME = "blox-data-sync";

type SyncEvent =
  | { type: "products:changed"; payload: { custom: unknown; hidden: unknown } }
  | { type: "orders:changed"; payload: { orders: unknown } }
  | { type: "catalog:request" }
  | { type: "catalog:snapshot"; payload: { custom: unknown; hidden: unknown; orders: unknown } };

type Listener = (event: SyncEvent) => void;

class SyncBus {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<Listener>();

  constructor() {
    if (typeof window === "undefined") return;
    if ("BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.addEventListener("message", this.handleMessage);
    }
    window.addEventListener("storage", this.handleStorage);
  }

  private handleMessage = (e: MessageEvent<SyncEvent>) => {
    this.listeners.forEach((cb) => cb(e.data));
  };

  private handleStorage = (e: StorageEvent) => {
    if (!e.key) return;
    if (e.key === "blox-admin-products") {
      this.emit({
        type: "products:changed",
        payload: {
          custom: e.newValue ? JSON.parse(e.newValue) : [],
          hidden: this.readHidden(),
        },
      });
    } else if (e.key === "blox-orders") {
      this.emit({
        type: "orders:changed",
        payload: { orders: e.newValue ? JSON.parse(e.newValue) : [] },
      });
    }
  };

  private readHidden(): string[] {
    try {
      const data = localStorage.getItem("blox-admin-hidden");
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private emit(event: SyncEvent) {
    this.listeners.forEach((cb) => cb(event));
  }

  send(event: SyncEvent) {
    if (this.channel) {
      this.channel.postMessage(event);
    }
    this.emit(event);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy() {
    if (this.channel) {
      this.channel.removeEventListener("message", this.handleMessage);
      this.channel.close();
      this.channel = null;
    }
    window.removeEventListener("storage", this.handleStorage);
    this.listeners.clear();
  }
}

let bus: SyncBus | null = null;

export function getSyncBus(): SyncBus {
  if (!bus) bus = new SyncBus();
  return bus;
}
