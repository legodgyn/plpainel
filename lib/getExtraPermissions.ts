import { createClient } from "@supabase/supabase-js";

export type ExtraPermissions = {
  user_id: string;
  can_change_layout: boolean;
  can_transfer_sites: boolean;
  can_view_orders: boolean;
  can_manage_suggestions: boolean;
  can_use_custom_domain: boolean;
};

export const emptyExtraPermissions: ExtraPermissions = {
  user_id: "",
  can_change_layout: false,
  can_transfer_sites: false,
  can_view_orders: false,
  can_manage_suggestions: false,
  can_use_custom_domain: false,
};

export async function getExtraPermissions(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("user_extra_permissions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return {
      ...emptyExtraPermissions,
      user_id: userId,
    };
  }

  return data as ExtraPermissions;
}