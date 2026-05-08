#!/usr/bin/env node
import { readFileSync } from "node:fs";

const [, , to = "", from = ""] = process.argv;
const raw = readFileSync(0, "utf8");
const appUrl = (process.env.PANEL_APP_URL || "https://plpainel.com").replace(/\/$/, "");
const secret = process.env.INBOUND_EMAIL_SECRET || "";

if (!secret) {
  console.error("Missing INBOUND_EMAIL_SECRET");
  process.exit(75);
}

const subject = raw.match(/^subject:\s*(.+)$/im)?.[1]?.trim() || "";

const res = await fetch(`${appUrl}/api/inbound-email`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-inbound-secret": secret,
  },
  body: JSON.stringify({
    to,
    from,
    subject,
    raw,
  }),
});

if (!res.ok) {
  const text = await res.text().catch(() => "");
  console.error(`Inbound email API failed: ${res.status} ${text}`);
  process.exit(75);
}
