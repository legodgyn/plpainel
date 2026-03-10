import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { number, text } = await req.json();

    const res = await fetch("http://127.0.0.1:8080/message/sendText/plpainelqr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.EVOLUTION_API_KEY!,
      },
      body: JSON.stringify({
        number,
        text,
      }),
    });

    const data = await res.json();

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}