export async function createTxtRecord({
  zoneId,
  name,
  content,
}: {
  zoneId: string;
  name: string;
  content: string;
}) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "TXT",
        name,
        content,
        ttl: 120,
      }),
    }
  );

  const data = await res.json();

  if (!data.success) {
    throw new Error(JSON.stringify(data.errors));
  }

  return data;
}
