import { supabase } from './lib/supabase'

// ─── Gastos ───────────────────────────────────────────────────────────────────

export async function fetchAll() {
  const { data: gastos, error: gError } = await supabase
    .from('gastos')
    .select('*')
    .order('fecha', { ascending: false })

  if (gError) throw gError

  const { data: rates, error: rError } = await supabase
    .from('usd_rates')
    .select('month_key, rate')

  if (rError) throw rError

  // Build usdRates map: { "2026-02": 1450 }
  const usdRates = Object.fromEntries((rates || []).map(r => [r.month_key, r.rate]))

  return { gastos: gastos || [], usdRates }
}

export async function createGasto(data) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: created, error } = await supabase
    .from('gastos')
    .insert({ ...data, user_id: user.id })
    .select()
    .single()

  if (error) throw error
  return created
}

export async function updateGasto(id, data) {
  // Remove fields that shouldn't be updated
  const { id: _id, user_id: _uid, created_at: _ca, ...updates } = data
  const { data: updated, error } = await supabase
    .from('gastos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return updated
}

export async function deleteGasto(id) {
  const { error } = await supabase
    .from('gastos')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { ok: true }
}

// ─── USD Rates ────────────────────────────────────────────────────────────────

export async function updateMonthRate(monthKey, usdRate) {
  const { data: { user } } = await supabase.auth.getUser()

  // Upsert: insert if not exists, update if exists
  const { error } = await supabase
    .from('usd_rates')
    .upsert({ user_id: user.id, month_key: monthKey, rate: usdRate })

  if (error) throw error

  // Return updated rates map
  const { data: rates, error: rError } = await supabase
    .from('usd_rates')
    .select('month_key, rate')

  if (rError) throw rError
  return { usdRates: Object.fromEntries(rates.map(r => [r.month_key, r.rate])) }
}
