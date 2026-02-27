import { useState, useMemo } from 'react'
import { BarChart2, Table2, TrendingUp, DollarSign, ArrowLeft } from 'lucide-react'
import Header from './Header'
import GastosTable from './GastosTable'
import Charts from './Charts'
import Promedios from './Promedios'
import Login from './Login'
import { demoGastos, demoUsdRates } from '../data/demoData'
import { useAuth } from '../contexts/AuthContext'

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MONTH_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DEFAULT_RATE = 1000
const monthKey = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`

export default function Landing() {
  const { signInWithGoogle } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [activeTab, setActiveTab] = useState('tabla')
  const [selectedYear] = useState(2026)
  const [selectedMonth, setSelectedMonth] = useState(0) // Ene

  const gastos = demoGastos
  const usdRates = demoUsdRates

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

  const totalAno = useMemo(() =>
    gastos
      .filter(g => new Date(g.fecha + 'T12:00:00').getFullYear() === selectedYear)
      .filter(g => g.concepto !== 'Inversiones')
      .reduce((a, g) => a + Number(g.cantidad), 0),
    [gastos, selectedYear]
  )

  const isPromedios = activeTab === 'promedios'

  // Pantalla de login (desde landing)
  if (showLogin) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <div className="p-4">
          <button
            onClick={() => setShowLogin(false)}
            className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a la demo
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <Login />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800 px-6 py-12">
        <div className="max-w-screen-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-500 mb-4 shadow-lg shadow-green-500/20">
            <DollarSign className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Gastos App</h1>
          <p className="text-gray-400 max-w-xl mx-auto mb-8">
            Controlá tus gastos personales por mes, categorías y forma de pago. Gráficos, promedios anuales, gastos recurrentes y tipo de cambio USD.
          </p>
          <button
            onClick={signInWithGoogle}
            className="bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-xl py-3 px-6 inline-flex items-center gap-2 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar con Google
          </button>
          <p className="text-gray-500 text-sm mt-6">Mirá abajo una vista de ejemplo con datos de demo (solo lectura).</p>
        </div>
      </section>

      {/* Demo app shell */}
      <Header
        total={isPromedios ? totalAno : totalMes}
        usdRate={currentRate}
        usdRates={usdRates}
        setUsdRates={() => {}}
        monthKey={currentMonthKey}
        monthLabel={isPromedios ? `Año ${selectedYear}` : `${MONTH_FULL[selectedMonth]} ${selectedYear}`}
        isPromedios={isPromedios}
        user={null}
        demo
        onSignIn={() => setShowLogin(true)}
      />

      <div className="bg-gray-900 border-b border-gray-800 px-4">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-2 overflow-x-auto py-1">
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1.5 mr-2 flex-shrink-0">
            <span className="text-white font-bold text-sm w-10 text-center">{selectedYear}</span>
          </div>
          {MONTH_NAMES.map((name, idx) => {
            const hasData = gastos.some(g => {
              const d = new Date(g.fecha + 'T12:00:00')
              return d.getFullYear() === selectedYear && d.getMonth() === idx
            })
            const isActive = !isPromedios && selectedMonth === idx
            return (
              <button
                key={idx}
                onClick={() => { setSelectedMonth(idx); setActiveTab('tabla') }}
                className={`flex-shrink-0 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                  isActive ? 'bg-green-600 text-white' : hasData ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-600'
                }`}
              >
                {name}{String(selectedYear).slice(2)}
                {hasData && !isActive && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-500 inline-block align-middle" />}
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
                activeTab === 'tabla' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-white'
              }`}
            >
              <Table2 className="w-4 h-4" />
              Tabla
            </button>
            <button
              onClick={() => setActiveTab('charts')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'charts' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-white'
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
            <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              <Promedios gastos={gastos} selectedYear={selectedYear} usdRates={usdRates} />
            </div>
          ) : activeTab === 'tabla' ? (
            <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 320px)' }}>
              <GastosTable
                gastos={gastosDelMes}
                setGastos={() => {}}
                allGastos={gastos}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                demo
              />
            </div>
          ) : (
            <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(100vh - 320px)' }}>
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
