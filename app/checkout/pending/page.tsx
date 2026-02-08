import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type SearchParams = { order?: string };

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return (
      <div className="mx-auto max-w-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <p className="mt-2 text-white/70">Faça login para ver seu pedido.</p>
        <Link className="mt-6 inline-block rounded-xl bg-purple-600 px-4 py-2" href="/login">
          Ir para login
        </Link>
      </div>
    );
  }

  // Pega order específica OU última pending do usuário
  const q = supabase
    .from("token_orders")
    .select("id, status, quantity, amount, mp_init_point, created_at")
    .eq("user_id", user.id);

  const { data: order } = sp.order
    ? await q.eq("id", sp.order).single()
    : await q.eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-xl px-5 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold">Pagamento pendente</h1>
          <p className="mt-2 text-white/70">
            Se você ainda não pagou, finalize via PIX. Assim que o Mercado Pago confirmar,
            seus tokens entram automaticamente.
          </p>

          {!order ? (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-white/70">
              Nenhuma compra pendente encontrada.
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Pedido</span>
                  <span className="font-medium">{order.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Quantidade</span>
                  <span className="font-medium">{order.quantity} token(s)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Total</span>
                  <span className="font-medium">
                    {Number(order.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60">Status</span>
                  <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-xs text-yellow-200">
                    Pendente
                  </span>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {order.mp_init_point ? (
                  <a
                    href={order.mp_init_point}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:opacity-90"
                  >
                    Pagar com PIX
                  </a>
                ) : null}

                <Link
                  href="/dashboard"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10"
                >
                  Voltar ao dashboard
                </Link>
              </div>

              <p className="mt-4 text-xs text-white/50">
                Dica: se você pagou agora, aguarde alguns segundos e recarregue.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
