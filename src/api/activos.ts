import { supabase } from "@/lib";
import type { ActivoCuenta, ActivoSnapshot, ActivoItem } from "@/types";

export async function fetchActivoCuentas(): Promise<ActivoCuenta[]> {
  const { data, error } = await supabase
    .from("activos_cuentas")
    .select("*")
    .order("orden", { ascending: true });
  if (error) throw error;
  return (data || []) as ActivoCuenta[];
}

export async function createActivoCuenta(
  payload: Omit<ActivoCuenta, "id" | "user_id" | "created_at">,
): Promise<ActivoCuenta> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("activos_cuentas")
    .insert({ ...payload, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data as ActivoCuenta;
}

export async function updateActivoCuenta(
  id: string,
  payload: Partial<Omit<ActivoCuenta, "id" | "user_id" | "created_at">>,
): Promise<ActivoCuenta> {
  const { data, error } = await supabase
    .from("activos_cuentas")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ActivoCuenta;
}

export async function deleteActivoCuenta(id: string): Promise<void> {
  const { error } = await supabase.from("activos_cuentas").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchActivoSnapshots(): Promise<ActivoSnapshot[]> {
  const { data, error } = await supabase
    .from("activos_snapshots")
    .select("*, activos_items(*)")
    .order("fecha", { ascending: true });
  if (error) throw error;
  return (data || []) as ActivoSnapshot[];
}

export async function createActivoSnapshot(
  snapshot: { fecha: string; usd_rate: number },
  items: Omit<ActivoItem, "id" | "snapshot_id">[],
): Promise<ActivoSnapshot> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: snap, error: snapError } = await supabase
    .from("activos_snapshots")
    .insert({ ...snapshot, user_id: user.id })
    .select()
    .single();
  if (snapError) throw snapError;

  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from("activos_items")
      .insert(items.map((i) => ({ ...i, snapshot_id: snap.id })));
    if (itemsError) throw itemsError;
  }

  return { ...snap, activos_items: items.map((i) => ({ ...i, snapshot_id: snap.id })) } as ActivoSnapshot;
}

export async function updateActivoSnapshot(
  id: string,
  snapshot: { fecha?: string; usd_rate?: number },
  items: Omit<ActivoItem, "id" | "snapshot_id">[],
): Promise<void> {
  if (Object.keys(snapshot).length > 0) {
    const { error } = await supabase
      .from("activos_snapshots")
      .update(snapshot)
      .eq("id", id);
    if (error) throw error;
  }

  // Replace all items for this snapshot
  const { error: delError } = await supabase
    .from("activos_items")
    .delete()
    .eq("snapshot_id", id);
  if (delError) throw delError;

  if (items.length > 0) {
    const { error: insError } = await supabase
      .from("activos_items")
      .insert(items.map((i) => ({ ...i, snapshot_id: id })));
    if (insError) throw insError;
  }
}

export async function deleteActivoSnapshot(id: string): Promise<void> {
  const { error } = await supabase.from("activos_snapshots").delete().eq("id", id);
  if (error) throw error;
}
