export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function pageview(url: string) {
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return;

  window.gtag("config", GA_ID, {
    page_path: url,
  });
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
