export default {
  async email(message, env) {
    const raw = await new Response(message.raw).text();

    const response = await fetch(`${env.APP_URL}/api/inbound-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-inbound-secret": env.INBOUND_EMAIL_SECRET,
      },
      body: JSON.stringify({
        to: message.to,
        from: message.from,
        subject: message.headers.get("subject") || "",
        raw,
      }),
    });

    if (!response.ok) {
      message.setReject("Nao foi possivel entregar o email ao painel.");
    }
  },
};
