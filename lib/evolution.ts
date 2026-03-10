function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

export async function sendEvolutionText(phone: string, text: string) {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!baseUrl) throw new Error("Missing EVOLUTION_API_URL");
  if (!apiKey) throw new Error("Missing EVOLUTION_API_KEY");
  if (!instance) throw new Error("Missing EVOLUTION_INSTANCE");

  const number = onlyDigits(phone);
  if (!number) throw new Error("Número inválido.");

  const res = await fetch(`${baseUrl}/message/sendText/${instance}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({
      number: number.startsWith("55") ? number : `55${number}`,
      text,
    }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.message || json?.error || "Erro ao enviar WhatsApp.");
  }

  return json;
}
