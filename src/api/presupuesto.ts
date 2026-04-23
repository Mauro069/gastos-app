import { supabase } from "@/lib";
import type { ConversionUsdc, PresupuestoMensual, CategoriaBudget } from "@/types";

// ── Conversiones USDC → ARS ───────────────────────────────────────────────────

export async function fetchConversionesByMonth(monthKey: string): Promise<ConversionUsdc[]> {
  const [year, month] = monthKey.split("-");
  const from = `${year}-${month}-01`;
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  const to = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("conversiones_usdc")
    .select("*")
    .gte("fecha", from)
    .lte("fecha", to)
    .order("fecha", { ascending: false });

  if (error) throw error;
  return (data || []) as ConversionUsdc[];
}

export async function fetchConversionesByYear(year: number): Promise<ConversionUsdc[]> {
  const { data, error } = await supabase
    .from("conversiones_usdc")
    .select("*")
    .gte("fecha", `${year}-01-01`)
    .lte("fecha", `${year}-12-31`)
    .order("fecha", { ascending: false });

  if (error) throw error;
  return (data || []) as ConversionUsdc[];
}

export async function createConversion(
  payload: Omit<ConversionUsdc, "id" | "user_id" | "created_at">,
): Promise<ConversionUsdc> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("conversiones_usdc")
    .insert({ ...payload, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as ConversionUsdc;
}

export async function updateConversion(
  id: string,
  payload: Partial<Omit<ConversionUsdc, "id" | "user_id" | "created_at">>,
): Promise<ConversionUsdc> {
  const { data, error } = await supabase
    .from("conversiones_usdc")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ConversionUsdc;
}

export async function deleteConversion(id: string): Promise<void> {
  const { error } = await supabase.from("conversiones_usdc").delete().eq("id", id);
  if (error) throw error;
}

// ── Presupuesto mensual ───────────────────────────────────────────────────────

export async function fetchPresupuesto(monthKey: string): Promise<PresupuestoMensual | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("presupuesto_mensual")
    .select("*")
    .eq("user_id", user.id)
    .eq("month_key", monthKey)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    categorias_budget: (data.categorias_budget || []) as CategoriaBudget[],
  } as PresupuestoMensual;
}

export async function upsertPresupuesto(
  monthKey: string,
  payload: {
    ingreso_usd: number;
    ahorro_usd: number;
    inversion_usd: number;
    categorias_budget: CategoriaBudget[];
    notas?: string;
  },
): Promise<PresupuestoMensual> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("presupuesto_mensual")
    .upsert(
      {
        user_id: user.id,
        month_key: monthKey,
        ...payload,
      },
      { onConflict: "user_id,month_key" },
    )
    .select()
    .single();

  if (error) throw error;
  return {
    ...data,
    categorias_budget: (data.categorias_budget || []) as CategoriaBudget[],
  } as PresupuestoMensual;
}

export async function deletePresupuesto(id: string): Promise<void> {
  const { error } = await supabase.from("presupuesto_mensual").delete().eq("id", id);
  if (error) throw error;
}
