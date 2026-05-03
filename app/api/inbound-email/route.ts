import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function env(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }

  return value;
}

function getHeader(raw: string, name: string) {
  const regex = new RegExp(`^${name}:\\s*(.+)$`, "im");
  return raw.match(regex)?.[1]?.trim() || "";
}

function getBody(raw: string) {
  const parts = raw.split(/\r?\n\r?\n/);
  return parts.slice(1).join("\n\n").trim().slice(0, 20000);
}

function detectCode(text: string) {
  return text.match(/\b\d{4,8}\b/)?.[0] || null;
}

export async function POST(req: Request) {
  try {
    const secret = req.headers.get("x-inbound-secret");

    if (secret !== env("INBOUND_EMAIL_SECRET")) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const toEmail = String(body.to || "").trim().toLowerCase();
    const fromEmail = String(body.from || "").trim();
    const raw = String(body.raw || "");

    if (!toEmail || !toEmail.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Invalid to email" },
        { status: 400 }
      );
    }

    const domain = toEmail.split("@")[1];

    const subject = getHeader(raw, "subject") || String(body.subject || "");
    const textBody = getBody(raw);
    const detectedCode = detectCode(`${subject}\n${textBody}`);

    const supabase = createClient(
      env("NEXT_PUBLIC_SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY")
    );

    const { data: domainRow } = await supabase
      .from("available_domains")
      .select("assigned_user_id")
      .eq("domain", domain)
      .in("status", ["sold", "used"])
      .maybeSingle();

    const userId = domainRow?.assigned_user_id;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Domain not assigned" },
        { status: 404 }
      );
    }

    const { error } = await supabase.from("domain_inbox_emails").insert({
      user_id: userId,
      domain,
      from_email: fromEmail,
      to_email: toEmail,
      subject,
      body: textBody,
      raw,
      detected_code: detectedCode,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Erro ao receber e-mail" },
      { status: 500 }
    );
  }
}
