export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

type PurchaseItem = {
  item_id?: string;
  item_name: string;
  price: number;
  quantity?: number;
};

type PurchasePayload = {
  transaction_id: string;
  value: number;
  currency?: string;
  coupon?: string;
  affiliation?: string;
  items: PurchaseItem[];
};

type BeginCheckoutPayload = {
  value: number;
  currency?: string;
  items: PurchaseItem[];
};

export function trackBeginCheckout(payload: BeginCheckoutPayload) {
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return;

  window.gtag("event", "begin_checkout", {
    value: payload.value,
    currency: payload.currency || "BRL",
    items: payload.items,
  });
}

export function trackPurchase(payload: PurchasePayload) {
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return;

  window.gtag("event", "purchase", {
    transaction_id: payload.transaction_id,
    value: payload.value,
    currency: payload.currency || "BRL",
    coupon: payload.coupon,
    affiliation: payload.affiliation,
    items: payload.items,
  });
}
