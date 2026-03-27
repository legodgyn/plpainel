"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    dataLayer: any[];
  }
}

type Props = {
  orderId: string;
  totalCents: number;
  affiliateCode?: string | null;
};

export default function PurchaseSuccessTracker({
  orderId,
  totalCents,
  affiliateCode,
}: Props) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    const value = totalCents / 100;

    window.dataLayer = window.dataLayer || [];

    window.dataLayer.push({
      event: "purchase",
      transaction_id: orderId,
      value,
      currency: "BRL",
      affiliate_code: affiliateCode || null,
      ecommerce: {
        transaction_id: orderId,
        value,
        currency: "BRL",
        items: [
          {
            item_name: "Tokens PL Painel",
            price: value,
            quantity: 1,
          },
        ],
      },
    });

    console.log("🔥 PURCHASE DISPARADO:", {
      orderId,
      value,
    });
  }, [orderId, totalCents, affiliateCode]);

  return null;
}
