import { supabase } from "@/lib";
import type { Gasto, CreateGastoData } from "@/types";

export async function fetchGastosByRange(from: string, to: string): Promise<Gasto[]> {
  const { data, error } = await supabase
    .from("gastos")
    .select("*")
    .gte("fecha", from)
    .lte("fecha", to)
    .order("fecha", { ascending: false });

  if (error) throw error;
  return (data || []) as Gasto[];
}

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

export async function deleteManyGastos(ids: string[]): Promise<{ ok: boolean }> {
  if (ids.length === 0) return { ok: true };
  const { error } = await supabase.from("gastos").delete().in("id", ids);
  if (error) throw error;
  return { ok: true };
}

export async function setFijoManyGastos(ids: string[], fijo: boolean): Promise<{ ok: boolean }> {
  if (ids.length === 0) return { ok: true };
  const { error } = await supabase.from("gastos").update({ fijo }).in("id", ids);
  if (error) throw error;
  return { ok: true };
}
