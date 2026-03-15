function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

export async function sendEvolutionText(phone: string, text: string) {
  const baseUrl = String(process.env.EVOLUTION_API_URL || "").replace(/\/+$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!baseUrl) throw new Error("Missing EVOLUTION_API_URL");
  if (!apiKey) throw new Error("Missing EVOLUTION_API_KEY");
  if (!instance) throw new Error("Missing EVOLUTION_INSTANCE");

  const digits = onlyDigits(phone);
  if (!digits) throw new Error("Número inválido.");

  const number = digits.startsWith("55") ? digits : `55${digits}`;
  const url = `${baseUrl}/message/sendText/${instance}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({
      number,
      text,
    }),
    cache: "no-store",
  });

  const raw = await res.text();
  let json: any = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    json = { raw };
  }

  if (!res.ok) {
    throw new Error(
      json?.message ||
        json?.error ||
        json?.response?.message ||
        `Erro ao enviar WhatsApp. Status ${res.status}`
    );
  }

  return json;
}
