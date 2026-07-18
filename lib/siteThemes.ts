export const VERIFICATION_TEMPLATE_TYPES = [
  "verification_green",
  "verification_blue",
  "verification_wine",
  "verification_graphite",
  "verification_gold",
] as const;

export type VerificationTemplateType = (typeof VERIFICATION_TEMPLATE_TYPES)[number];

export function getVerificationTemplateType(seed: unknown): VerificationTemplateType {
  const input = String(seed || Date.now());
  let hash = 0;

  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }

  return VERIFICATION_TEMPLATE_TYPES[hash % VERIFICATION_TEMPLATE_TYPES.length];
}
