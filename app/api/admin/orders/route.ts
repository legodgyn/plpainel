import { NextResponse } from "next/server";
import { assertAdmin } from "../_guard";

export async function GET(req: Request) {
  const admin = await assertAdmin(req);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.message }, { status: admin.status });
  }

  // Aqui ajusta os campos conforme sua tabela token_orders
  // (não use buyer_email, porque pelo print não existe)
  const { data: orders, error } = await admin.service
    .from("token_orders")
    .select("id, user_id, total_cents, status, created_at, mp_payment_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Pegar e-mails dos usuários (auth.users não dá pra ler com from(), então:
  // se você tiver uma tabela profile/users pública com email, use ela.
  // Como você já exibe email em outros lugares, provavelmente você tem algo.
  // Se NÃO tiver, por enquanto retornamos só user_id.
  //
  // ✅ Se você tiver uma tabela "profiles" com (id, email):
  // const userIds = [...new Set((orders||[]).map(o => o.user_id).filter(Boolean))];
  // const { data: profs } = await admin.service.from("profiles").select("id,email").in("id", userIds);

  return NextResponse.json({
    ok: true,
    orders: orders ?? [],
    adminEmail: admin.userEmail,
  });
}
