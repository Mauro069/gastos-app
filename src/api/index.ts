import { supabase } from "@/lib";
import type { Ingreso, ActivoCuenta, ActivoSnapshot, ActivoItem } from "@/types";
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
    (data || []).map((r: { month_key: string; rate: number }) => [
      r.month_key,
      r.rate,
    ]),
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

export async function deleteManyGastos(
  ids: string[],
): Promise<{ ok: boolean }> {
  if (ids.length === 0) return { ok: true };
  const { error } = await supabase.from("gastos").delete().in("id", ids);
  if (error) throw error;
  return { ok: true };
}

// ── User Settings ────────────────────────────────────────────────────────────

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

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_user_account");
  if (error) throw error;
  await supabase.auth.signOut();
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

// ── Ingresos ──────────────────────────────────────────────────────────────────

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

// ── Activos: Cuentas ──────────────────────────────────────────────────────────

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

// ── Activos: Snapshots ────────────────────────────────────────────────────────

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
