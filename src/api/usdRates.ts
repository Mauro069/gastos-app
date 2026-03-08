import { supabase } from "@/lib";
import type { FetchAllResponse, UpdateMonthRateResponse } from "@/types";

export async function fetchUsdRates(): Promise<FetchAllResponse["usdRates"]> {
  const { data, error } = await supabase
    .from("usd_rates")
    .select("month_key, rate");

  if (error) throw error;
  return Object.fromEntries(
    (data || []).map((r: { month_key: string; rate: number }) => [
      r.month_key,
      r.rate,
    ]),
  );
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
