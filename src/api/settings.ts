import { supabase } from "@/lib";
import type { UserSettings } from "@/types";
import { FORMAS, CONCEPTOS } from "@/constants";

export const DEFAULT_SETTINGS: UserSettings = {
  formas: [...FORMAS],
  conceptos: [...CONCEPTOS],
};

export async function getUserSettings(): Promise<UserSettings> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DEFAULT_SETTINGS;

  const { data, error } = await supabase
    .from("user_settings")
    .select("settings")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return DEFAULT_SETTINGS;

  const s = data.settings as Partial<UserSettings>;
  return {
    formas:
      Array.isArray(s.formas) && s.formas.length > 0
        ? s.formas
        : DEFAULT_SETTINGS.formas,
    conceptos:
      Array.isArray(s.conceptos) && s.conceptos.length > 0
        ? s.conceptos
        : DEFAULT_SETTINGS.conceptos,
  };
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, settings });

  if (error) throw error;
}

export async function bulkRenameGastoField(
  field: "concepto" | "forma",
  oldValue: string,
  newValue: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("gastos")
    .update({ [field]: newValue })
    .eq(field, oldValue)
    .eq("user_id", user.id);
  if (error) throw error;
}
