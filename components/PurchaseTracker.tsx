"use client";

import { useEffect, useRef } from "react";
import { trackPurchase } from "@/lib/ga";

type Props = {
  orderId: string;
  totalCents: number;
  itemName?: string;
  affiliation?: string;
};

export default function PurchaseTracker({
  orderId,
  totalCents,
  itemName = "Tokens PL Painel",
  affiliation,
}: Props) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (!orderId || !totalCents) return;

    firedRef.current = true;

    trackPurchase({
      transaction_id: orderId,
      value: totalCents / 100,
      currency: "BRL",
      affiliation,
      items: [
        {
          item_id: orderId,
          item_name: itemName,
          price: totalCents / 100,
          quantity: 1,
        },
      ],
    });
  }, [orderId, totalCents, itemName, affiliation]);

  return null;
}
