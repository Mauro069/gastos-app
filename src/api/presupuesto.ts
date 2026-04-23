import { supabase } from "@/lib";
import type { Presupuesto, PresupuestoItem } from "@/types";

/** Fetch the presupuesto for a given year+month, or null if none exists. */
export async function fetchPresupuesto(
  year: number,
  month: number,
): Promise<Presupuesto | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("presupuestos")
    .select("*, presupuesto_items(*)")
    .eq("user_id", user.id)
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    presupuesto_items: (data.presupuesto_items || []) as PresupuestoItem[],
  } as Presupuesto;
}

/** Create a new presupuesto with its items. */
export async function createPresupuesto(payload: {
  year: number;
  month: number;
  total_usd: number;
  usd_rate: number;
  items: Omit<PresupuestoItem, "id" | "presupuesto_id">[];
}): Promise<Presupuesto> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: pres, error: presErr } = await supabase
    .from("presupuestos")
    .insert({
      user_id: user.id,
      year: payload.year,
      month: payload.month,
      total_usd: payload.total_usd,
      usd_rate: payload.usd_rate,
    })
    .select()
    .single();

  if (presErr) throw presErr;

  let items: PresupuestoItem[] = [];
  if (payload.items.length > 0) {
    const { data: itemsData, error: itemsErr } = await supabase
      .from("presupuesto_items")
      .insert(payload.items.map((i) => ({ ...i, presupuesto_id: pres.id })))
      .select();
    if (itemsErr) throw itemsErr;
    items = (itemsData || []) as PresupuestoItem[];
  }

  return { ...pres, presupuesto_items: items } as Presupuesto;
}

/** Update an existing presupuesto and replace all its items. */
export async function updatePresupuesto(
  id: string,
  payload: {
    total_usd?: number;
    usd_rate?: number;
    items: Omit<PresupuestoItem, "id" | "presupuesto_id">[];
  },
): Promise<Presupuesto> {
  // Update header fields
  const { data: pres, error: presErr } = await supabase
    .from("presupuestos")
    .update({
      ...(payload.total_usd !== undefined && { total_usd: payload.total_usd }),
      ...(payload.usd_rate !== undefined && { usd_rate: payload.usd_rate }),
    })
    .eq("id", id)
    .select()
    .single();

  if (presErr) throw presErr;

  // Replace all items
  const { error: delErr } = await supabase
    .from("presupuesto_items")
    .delete()
    .eq("presupuesto_id", id);
  if (delErr) throw delErr;

  let items: PresupuestoItem[] = [];
  if (payload.items.length > 0) {
    const { data: itemsData, error: itemsErr } = await supabase
      .from("presupuesto_items")
      .insert(payload.items.map((i) => ({ ...i, presupuesto_id: id })))
      .select();
    if (itemsErr) throw itemsErr;
    items = (itemsData || []) as PresupuestoItem[];
  }

  return { ...pres, presupuesto_items: items } as Presupuesto;
}

/** Delete a presupuesto (items cascade via FK). */
export async function deletePresupuesto(id: string): Promise<void> {
  const { error } = await supabase.from("presupuestos").delete().eq("id", id);
  if (error) throw error;
}
