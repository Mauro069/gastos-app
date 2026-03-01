import { useState, useEffect } from 'react'
import { DollarSign, Edit2, Check, X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { updateMonthRate } from '@/api'
import type { HeaderProps } from '@/types'
import ProfileModal from './ProfileModal'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default function Header({
  total,
  prevTotal,
  usdRate,
  usdRates,
  setUsdRates,
  monthKey,
  monthLabel,
  user,
  demo,
  onSignIn,
}: HeaderProps) {
  const [editing, setEditing] = useState(false)
  const [tempRate, setTempRate] = useState(usdRate)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    setTempRate(usdRate)
  }, [usdRate, monthKey])

  const hasCustomRate = !!usdRates?.[monthKey]

  const handleSave = async () => {
    if (demo) return
    const rate = Number(tempRate)
    if (!isNaN(rate) && rate > 0) {
      const result = await updateMonthRate(monthKey, rate)
      setUsdRates(result.usdRates)
    }
    setEditing(false)
  }

  const delta = prevTotal && prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null
  const isUp = delta !== null && delta > 0
  const isDown = delta !== null && delta < 0

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-3 sticky top-0 z-20">
      <div className="max-w-screen-2xl mx-auto flex items-center gap-3 sm:gap-4">

        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="bg-green-500 rounded-xl p-1.5">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-white hidden sm:block">Gastos App</span>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-800 flex-shrink-0" />

        {/* Total del mes + insight */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider leading-none mb-0.5 truncate">
              {monthLabel}
            </p>
            <p className="text-xl sm:text-2xl font-bold text-white leading-none tabular-nums">
              {fmt(total)}
            </p>
          </div>

          {/* Insight chip vs mes anterior */}
          {delta !== null && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
              isUp
                ? 'bg-red-950/60 border border-red-800/50 text-red-400'
                : isDown
                  ? 'bg-green-950/60 border border-green-800/50 text-green-400'
                  : 'bg-gray-800 border border-gray-700 text-gray-400'
            }`}>
              {isUp
                ? <TrendingUp className="w-3 h-3" />
                : isDown
                  ? <TrendingDown className="w-3 h-3" />
                  : <Minus className="w-3 h-3" />}
              <span>{isUp ? '+' : ''}{delta.toFixed(0)}%</span>
            </div>
          )}
        </div>

        {/* USD rate — editable, compact */}
        <div className="flex-shrink-0">
          {editing && !demo ? (
            <div className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5">
              <span className="text-gray-400 text-xs">$</span>
              <input
                type="number"
                value={tempRate}
                onChange={e => setTempRate(Number(e.target.value) || 0)}
                className="bg-transparent text-white w-20 text-sm focus:outline-none tabular-nums"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') { setTempRate(usdRate); setEditing(false) }
                }}
              />
              <button onClick={handleSave} className="text-green-400 hover:text-green-300 transition-colors">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setTempRate(usdRate); setEditing(false) }} className="text-red-400 hover:text-red-300 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => !demo && setEditing(true)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-colors group ${
                demo ? 'cursor-default' : 'hover:bg-gray-800'
              }`}
              title={`Tipo de cambio USD — ${monthLabel}${!hasCustomRate ? ' (estimado)' : ''}`}
            >
              <span className="text-[10px] text-gray-600 uppercase tracking-wider">USD</span>
              <span className={`text-sm font-semibold tabular-nums ${hasCustomRate ? 'text-yellow-400' : 'text-gray-500'}`}>
                ${usdRate.toLocaleString('es-AR')}
              </span>
              {!hasCustomRate && (
                <span className="text-[10px] text-yellow-800">est.</span>
              )}
              {!demo && (
                <Edit2 className="w-3 h-3 text-gray-700 group-hover:text-gray-400 transition-colors" />
              )}
            </button>
          )}
        </div>

        {/* Sign in / Avatar */}
        {demo && onSignIn && (
          <button
            onClick={onSignIn}
            className="flex-shrink-0 bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
          >
            Entrar con Google
          </button>
        )}
        {user && !demo && (
          <button
            onClick={() => setShowProfile(true)}
            className="flex-shrink-0 rounded-full ring-2 ring-gray-700 hover:ring-green-500 transition-all"
            title="Ver perfil"
          >
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url as string}
                alt={(user.user_metadata?.full_name as string) || 'Usuario'}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">
                {((user.user_metadata?.full_name as string) || user.email || 'U')[0].toUpperCase()}
              </div>
            )}
          </button>
        )}

        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      </div>
    </header>
  )
}
