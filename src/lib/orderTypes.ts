import type { Currency } from "./products";

export type ProductMode = "permanente" | "fisico";

export interface OrderItem {
  productId: string;
  productName: string;
  slug: string;
  price: number;
  currency: Currency;
  mode?: ProductMode;
  image: string;
  category: string;
  notes: string;
  quantity: number;
  subtotal: number;
}

export interface OrderUser {
  name: string;
  phone: string;
  countryCode?: string;
  countryFlag?: string;
}

export type OrderStatus = "pending" | "confirmed" | "delivered" | "cancelled";

export interface Order {
  code: string;
  user: OrderUser;
  items: OrderItem[];
  total: number;
  totalsByCurrency?: Record<string, number>;
  currency: string;
  status: OrderStatus;
  paymentMethod: string;
  notes: string;
  createdAt: string;
}
