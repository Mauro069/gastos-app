import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'db.json')
const PORT = 3001

const app = express()
app.use(cors())
app.use(express.json())

// Read db.json
function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = { gastos: [], usdRates: {} }
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2))
    return initial
  }
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
  // migrate old single usdRate to usdRates map
  if (db.usdRate && !db.usdRates) {
    db.usdRates = {}
    delete db.usdRate
  }
  if (!db.usdRates) db.usdRates = {}
  return db
}

// Write db.json
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

// GET all gastos
app.get('/api/gastos', (req, res) => {
  const db = readDB()
  res.json(db)
})

// POST new gasto
app.post('/api/gastos', (req, res) => {
  const db = readDB()
  const newGasto = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  }
  db.gastos.push(newGasto)
  writeDB(db)
  res.status(201).json(newGasto)
})

// PUT update gasto
app.put('/api/gastos/:id', (req, res) => {
  const db = readDB()
  const idx = db.gastos.findIndex(g => g.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  db.gastos[idx] = { ...db.gastos[idx], ...req.body }
  writeDB(db)
  res.json(db.gastos[idx])
})

// DELETE gasto
app.delete('/api/gastos/:id', (req, res) => {
  const db = readDB()
  db.gastos = db.gastos.filter(g => g.id !== req.params.id)
  writeDB(db)
  res.json({ ok: true })
})

// PUT update USD rate for a specific month key (e.g. "2026-02")
// Body: { monthKey: "2026-02", usdRate: 1450 }
app.put('/api/settings', (req, res) => {
  const db = readDB()
  const { monthKey, usdRate } = req.body
  if (!monthKey || !usdRate) return res.status(400).json({ error: 'monthKey and usdRate required' })
  db.usdRates[monthKey] = Number(usdRate)
  writeDB(db)
  res.json({ usdRates: db.usdRates })
})

app.listen(PORT, () => {
  console.log(`🚀 API server running at http://localhost:${PORT}`)
})
