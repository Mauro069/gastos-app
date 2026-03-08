import { supabase } from "@/lib";
import type { Ingreso } from "@/types";

export async function fetchIngresosByYear(year: number): Promise<Ingreso[]> {
  const { data, error } = await supabase
    .from("ingresos")
    .select("*")
    .gte("fecha", `${year}-01-01`)
    .lte("fecha", `${year}-12-31`)
    .order("fecha", { ascending: false });

  if (error) throw error;
  return (data || []) as Ingreso[];
}

export async function createIngreso(
  payload: Omit<Ingreso, "id" | "user_id" | "created_at">,
): Promise<Ingreso> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("ingresos")
    .insert({ ...payload, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data as Ingreso;
}

export async function updateIngreso(
  id: string,
  payload: Partial<Omit<Ingreso, "id" | "user_id" | "created_at">>,
): Promise<Ingreso> {
  const { data, error } = await supabase
    .from("ingresos")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Ingreso;
}

export async function deleteIngreso(id: string): Promise<void> {
  const { error } = await supabase.from("ingresos").delete().eq("id", id);
  if (error) throw error;
}
