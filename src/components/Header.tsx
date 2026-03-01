import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Edit2, Check, X, Calendar } from 'lucide-react'
import { updateMonthRate } from '@/api'
import type { HeaderProps } from '@/types'
import ProfileModal from './ProfileModal'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)

export default function Header({
  total,
  inversionesTotal,
  usdRate,
  usdRates,
  setUsdRates,
  monthKey,
  monthLabel,
  isPromedios,
  user,
  onSignOut,
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

  const handleCancel = () => {
    setTempRate(usdRate)
    setEditing(false)
  }

  const totalUSD = total / usdRate

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-3">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 rounded-xl p-2">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">Gastos App</h1>
                {demo && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-xs font-medium border border-amber-500/40">
                    Demo
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                <span>{monthLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-gray-800 rounded-xl px-4 py-2.5 min-w-[160px]">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
                {isPromedios ? 'Total año' : 'Total mes'} ARS
              </p>
              <p className="text-lg font-bold text-white">{fmt(total)}</p>
              {!!inversionesTotal && inversionesTotal > 0 && (
                <p className="text-xs text-gray-500 mt-0.5" title={`Se excluyen ${fmt(inversionesTotal)} en inversiones`}>
                  + {fmt(inversionesTotal)} inv.
                </p>
              )}
            </div>

            <div className="bg-gray-800 rounded-xl px-4 py-2.5 min-w-[160px]">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
                {isPromedios ? 'Total año' : 'Total mes'} USD
              </p>
              <p className="text-lg font-bold text-green-400">{fmtUSD(totalUSD)}</p>
            </div>

            <div className="bg-gray-800 rounded-xl px-4 py-2.5 min-w-[160px]">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                USD {isPromedios ? '' : monthLabel}
                {!isPromedios && !hasCustomRate && (
                  <span className="ml-1 text-yellow-600 text-xs">(estimado)</span>
                )}
              </p>
              {editing && !isPromedios && !demo ? (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    value={tempRate}
                    onChange={e => setTempRate(Number(e.target.value) || 0)}
                    className="bg-gray-700 text-white rounded px-2 py-0.5 w-24 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSave()
                      if (e.key === 'Escape') handleCancel()
                    }}
                  />
                  <button onClick={handleSave} className="text-green-400 hover:text-green-300">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={handleCancel} className="text-red-400 hover:text-red-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-base font-bold ${hasCustomRate ? 'text-yellow-400' : 'text-yellow-700'}`}
                  >
                    ${usdRate.toLocaleString('es-AR')}
                  </span>
                  {!isPromedios && !demo && (
                    <button
                      onClick={() => {
                        setTempRate(usdRate)
                        setEditing(true)
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                      title={`Editar tipo de cambio de ${monthLabel}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {demo && onSignIn && (
            <button
              onClick={onSignIn}
              className="bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors"
            >
              Iniciar sesión con Google
            </button>
          )}
          {user && !demo && (
            <button
              onClick={() => setShowProfile(true)}
              className="ml-2 rounded-full ring-2 ring-gray-700 hover:ring-green-500 transition-all"
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
      </div>
    </header>
  )
}
