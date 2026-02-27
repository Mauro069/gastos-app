import { supabase } from "@/lib";
import type {
  FetchAllResponse,
  CreateGastoData,
  UpdateMonthRateResponse,
} from "@/types";
import type { Gasto } from "@/types";

export async function fetchAll(): Promise<FetchAllResponse> {
  const { data: gastos, error: gError } = await supabase
    .from("gastos")
    .select("*")
    .order("fecha", { ascending: false });

  if (gError) throw gError;

  const { data: rates, error: rError } = await supabase
    .from("usd_rates")
    .select("month_key, rate");

  if (rError) throw rError;

  const usdRates = Object.fromEntries(
    (rates || []).map((r: { month_key: string; rate: number }) => [
      r.month_key,
      r.rate,
    ]),
  ) as FetchAllResponse["usdRates"];

  return { gastos: gastos || [], usdRates };
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
