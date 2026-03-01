import { supabase } from "@/lib";
import type {
  FetchAllResponse,
  CreateGastoData,
  UpdateMonthRateResponse,
  UserSettings,
} from "@/types";
import type { Gasto } from "@/types";
import { FORMAS, CONCEPTOS } from "@/constants";

const DEFAULT_SETTINGS: UserSettings = {
  formas: [...FORMAS],
  conceptos: [...CONCEPTOS],
};

export async function fetchGastosByYear(year: number): Promise<Gasto[]> {
  const { data, error } = await supabase
    .from("gastos")
    .select("*")
    .gte("fecha", `${year}-01-01`)
    .lte("fecha", `${year}-12-31`)
    .order("fecha", { ascending: false });

  if (error) throw error;
  return (data || []) as Gasto[];
}

export async function fetchUsdRates(): Promise<FetchAllResponse["usdRates"]> {
  const { data, error } = await supabase
    .from("usd_rates")
    .select("month_key, rate");

  if (error) throw error;
  return Object.fromEntries(
    (data || []).map((r: { month_key: string; rate: number }) => [r.month_key, r.rate])
  );
}

export async function createGasto(data: CreateGastoData): Promise<Gasto> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: created, error } = await supabase
    .from("gastos")
    .insert({ ...data, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return created as Gasto;
}

export async function updateGasto(id: string, data: Gasto): Promise<Gasto> {
  const {
    id: _id,
    user_id: _uid,
    created_at: _ca,
    createdAt: _createdAt,
    ...updates
  } = data;
  const { data: updated, error } = await supabase
    .from("gastos")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return updated as Gasto;
}

export async function deleteGasto(id: string): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("gastos").delete().eq("id", id);
  if (error) throw error;
  return { ok: true };
}

// ── User Settings ────────────────────────────────────────────────────────────

export async function getUserSettings(): Promise<UserSettings> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return DEFAULT_SETTINGS

  const { data, error } = await supabase
    .from("user_settings")
    .select("settings")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) throw error
  if (!data) return DEFAULT_SETTINGS

  const s = data.settings as Partial<UserSettings>
  return {
    formas: Array.isArray(s.formas) && s.formas.length > 0 ? s.formas : DEFAULT_SETTINGS.formas,
    conceptos: Array.isArray(s.conceptos) && s.conceptos.length > 0 ? s.conceptos : DEFAULT_SETTINGS.conceptos,
  }
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, settings })

  if (error) throw error
}

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_user_account")
  if (error) throw error
  await supabase.auth.signOut()
}

// ── USD Rates ─────────────────────────────────────────────────────────────────

export async function updateMonthRate(
  monthKey: string,
  usdRate: number,
): Promise<UpdateMonthRateResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("usd_rates")
    .upsert({ user_id: user.id, month_key: monthKey, rate: usdRate });

  if (error) throw error;

  const { data: rates, error: rError } = await supabase
    .from("usd_rates")
    .select("month_key, rate");

  if (rError) throw rError;
  const usdRates = Object.fromEntries(
    (rates || []).map((r: { month_key: string; rate: number }) => [
      r.month_key,
      r.rate,
    ]),
  ) as UpdateMonthRateResponse["usdRates"];
  return { usdRates };
}
