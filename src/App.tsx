import { useState, useEffect, useMemo } from 'react'
import { BarChart2, Table2, Loader2, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { Header, GastosTable, Charts, Promedios, Landing } from '@/components'
import { fetchAll } from '@/api'
import { useAuth } from '@/contexts'
import type { Gasto, UsdRates } from '@/types'

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MONTH_FULL = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]
const DEFAULT_RATE = 1000

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [usdRates, setUsdRates] = useState<UsdRates>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'tabla' | 'charts' | 'promedios'>('tabla')

  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())

  useEffect(() => {
    if (!user) {
      setGastos([])
      setUsdRates({})
      return
    }
    setLoading(true)
    setError('')
    fetchAll()
      .then(data => {
        setGastos(data.gastos || [])
        setUsdRates(data.usdRates || {})
      })
      .catch(() => setError('Error cargando los datos. Recargá la página.'))
      .finally(() => setLoading(false))
  }, [user])

  const currentMonthKey = monthKey(selectedYear, selectedMonth)
  const currentRate = useMemo(() => {
    if (usdRates[currentMonthKey]) return usdRates[currentMonthKey]
    const keys = Object.keys(usdRates).sort()
    const prior = [...keys].reverse().find(k => k <= currentMonthKey)
    return prior ? usdRates[prior] : DEFAULT_RATE
  }, [usdRates, currentMonthKey])

  const gastosDelMes = useMemo(() => {
    return gastos.filter(g => {
      const d = new Date(g.fecha + 'T12:00:00')
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
    })
  }, [gastos, selectedYear, selectedMonth])

  const { prevYear, prevMonth: prevMonthIdx } = useMemo(() => {
    if (selectedMonth === 0) return { prevYear: selectedYear - 1, prevMonth: 11 }
    return { prevYear: selectedYear, prevMonth: selectedMonth - 1 }
  }, [selectedYear, selectedMonth])

  const gastosDelMesAnterior = useMemo(() => {
    return gastos.filter(g => {
      const d = new Date(g.fecha + 'T12:00:00')
      return d.getFullYear() === prevYear && d.getMonth() === prevMonthIdx
    })
  }, [gastos, prevYear, prevMonthIdx])

  const prevMonthLabel = `${MONTH_NAMES[prevMonthIdx]}${String(prevYear).slice(2)}`
  const currMonthLabel = `${MONTH_NAMES[selectedMonth]}${String(selectedYear).slice(2)}`

  const totalMes = gastosDelMes
    .filter(g => g.concepto !== 'Inversiones')
    .reduce((acc, g) => acc + Number(g.cantidad), 0)

  const totalAno = useMemo(
    () =>
      gastos
        .filter(g => new Date(g.fecha + 'T12:00:00').getFullYear() === selectedYear)
        .filter(g => g.concepto !== 'Inversiones')
        .reduce((a, g) => a + Number(g.cantidad), 0),
    [gastos, selectedYear]
  )

  const isPromedios = activeTab === 'promedios'

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-green-500" />
      </div>
    )
  }

  if (!user) return <Landing />

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <Loader2 className="w-10 h-10 animate-spin text-green-500" />
          <p className="text-sm">Cargando tus gastos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="bg-red-900/30 border border-red-700 rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 font-semibold text-lg mb-2">Error</p>
          <p className="text-gray-400 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl px-4 py-2 text-sm"
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header
        total={isPromedios ? totalAno : totalMes}
        usdRate={currentRate}
        usdRates={usdRates}
        setUsdRates={setUsdRates}
        monthKey={currentMonthKey}
        monthLabel={
          isPromedios ? `Año ${selectedYear}` : `${MONTH_FULL[selectedMonth]} ${selectedYear}`
        }
        isPromedios={isPromedios}
        user={user}
        onSignOut={signOut}
      />

      <div className="bg-gray-900 border-b border-gray-800 px-4">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-thin py-1">
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1.5 mr-2 flex-shrink-0">
            <button
              onClick={() => setSelectedYear(y => y - 1)}
              className="text-gray-400 hover:text-white p-0.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-white font-bold text-sm w-10 text-center">{selectedYear}</span>
            <button
              onClick={() => setSelectedYear(y => y + 1)}
              className="text-gray-400 hover:text-white p-0.5"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {MONTH_NAMES.map((name, idx) => {
            const hasData = gastos.some(g => {
              const d = new Date(g.fecha + 'T12:00:00')
              return d.getFullYear() === selectedYear && d.getMonth() === idx
            })
            const mk = monthKey(selectedYear, idx)
            const hasRate = !!usdRates[mk]
            const isActive = !isPromedios && selectedMonth === idx
            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedMonth(idx)
                  setActiveTab('tabla')
                }}
                className={`flex-shrink-0 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? 'bg-green-600 text-white'
                    : hasData
                      ? 'text-gray-200 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-800'
                }`}
              >
                {name}
                {String(selectedYear).slice(2)}
                {hasData && !isActive && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-500 inline-block align-middle" />
                )}
              </button>
            )
          })}

          <div className="w-px h-6 bg-gray-700 mx-1 flex-shrink-0" />

          <button
            onClick={() => setActiveTab('promedios')}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              isPromedios ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Promedios
          </button>
        </div>
      </div>

      {!isPromedios && (
        <div className="bg-gray-900/50 border-b border-gray-800/50 px-6">
          <div className="max-w-screen-2xl mx-auto flex gap-1">
            <button
              onClick={() => setActiveTab('tabla')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tabla'
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              <Table2 className="w-4 h-4" />
              Tabla
            </button>
            <button
              onClick={() => setActiveTab('charts')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'charts'
                  ? 'border-green-500 text-green-400'
                  : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Gráficos
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-hidden">
        <div className="max-w-screen-2xl mx-auto h-full p-6">
          {isPromedios ? (
            <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              <Promedios gastos={gastos} selectedYear={selectedYear} usdRates={usdRates} />
            </div>
          ) : activeTab === 'tabla' ? (
            <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 180px)' }}>
              <GastosTable
                gastos={gastosDelMes}
                setGastos={setGastos}
                allGastos={gastos}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
              />
            </div>
          ) : (
            <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 180px)' }}>
              <Charts
                gastos={gastosDelMes}
                prevGastos={gastosDelMesAnterior}
                monthLabel={currMonthLabel}
                prevMonthLabel={prevMonthLabel}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
