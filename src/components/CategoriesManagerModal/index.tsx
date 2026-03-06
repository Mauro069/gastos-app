import { useState } from 'react'
import { X, Plus, CreditCard, Tag } from 'lucide-react'
import { useUserSettings } from '@/contexts'
import { getChipHex, getChipStyle } from '@/utils/chipColor'
import Chip from './Chip'
import AddChipInput from './AddChipInput'

export default function CategoriesManagerModal({
  onClose,
  initialSection = 'formas',
}: {
  onClose: () => void
  initialSection?: 'formas' | 'conceptos'
}) {
  const {
    settings,
    renameForma,
    renameConcepto,
    deleteForma,
    deleteConcepto,
    updateFormas,
    updateConceptos,
    updateFormaColor,
    updateConceptoColor,
  } = useUserSettings()

  const [addingForma, setAddingForma] = useState(false)
  const [addingConcepto, setAddingConcepto] = useState(false)
  const [activeSection] = useState(initialSection)

  const handleAddForma = async (name: string) => {
    await updateFormas([...settings.formas, name])
  }

  const handleAddConcepto = async (name: string) => {
    await updateConceptos([...settings.conceptos, name])
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-sm font-semibold text-white">
            Gestionar formas y conceptos
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Formas de pago */}
          <div
            className={`space-y-3 rounded-xl p-4 transition-colors ${activeSection === 'formas' ? 'ring-1 ring-blue-800/50 bg-blue-950/10' : ''}`}
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Formas de pago
              </h3>
              <span className="text-gray-600 text-xs">{settings.formas.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.formas.map(f => (
                <Chip
                  key={f}
                  value={f}
                  chipStyle={getChipStyle(f, 'forma', settings)}
                  currentHex={getChipHex(f, 'forma', settings)}
                  existing={settings.formas}
                  onRename={newName => renameForma(f, newName)}
                  onDelete={() => deleteForma(f)}
                  onColorChange={hex => updateFormaColor(f, hex)}
                />
              ))}
              {addingForma ? (
                <AddChipInput
                  existing={settings.formas}
                  onAdd={handleAddForma}
                  onCancel={() => setAddingForma(false)}
                />
              ) : (
                <button
                  onClick={() => setAddingForma(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-gray-500 hover:text-blue-400 bg-gray-800 border border-dashed border-gray-700 hover:border-blue-600 transition-all"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Conceptos */}
          <div
            className={`space-y-3 rounded-xl p-4 transition-colors ${activeSection === 'conceptos' ? 'ring-1 ring-green-800/50 bg-green-950/10' : ''}`}
          >
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-green-400" />
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Conceptos
              </h3>
              <span className="text-gray-600 text-xs">{settings.conceptos.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.conceptos.map(c => (
                <Chip
                  key={c}
                  value={c}
                  chipStyle={getChipStyle(c, 'concepto', settings)}
                  currentHex={getChipHex(c, 'concepto', settings)}
                  existing={settings.conceptos}
                  onRename={newName => renameConcepto(c, newName)}
                  onDelete={() => deleteConcepto(c)}
                  onColorChange={hex => updateConceptoColor(c, hex)}
                />
              ))}
              {addingConcepto ? (
                <AddChipInput
                  existing={settings.conceptos}
                  onAdd={handleAddConcepto}
                  onCancel={() => setAddingConcepto(false)}
                />
              ) : (
                <button
                  onClick={() => setAddingConcepto(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-gray-500 hover:text-green-400 bg-gray-800 border border-dashed border-gray-700 hover:border-green-600 transition-all"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed px-1">
            Al borrar una opción, los gastos que la usaban quedan sin concepto o
            forma asignado. Podés reasignarlos editando cada gasto.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-2.5 font-medium text-sm transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}
