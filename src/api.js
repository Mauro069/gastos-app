const BASE = '/api'

export async function fetchAll() {
  const res = await fetch(`${BASE}/gastos`)
  return res.json()
}

export async function createGasto(data) {
  const res = await fetch(`${BASE}/gastos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function updateGasto(id, data) {
  const res = await fetch(`${BASE}/gastos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return res.json()
}

export async function deleteGasto(id) {
  const res = await fetch(`${BASE}/gastos/${id}`, { method: 'DELETE' })
  return res.json()
}

// monthKey e.g. "2026-02"
export async function updateMonthRate(monthKey, usdRate) {
  const res = await fetch(`${BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthKey, usdRate })
  })
  return res.json()
}
