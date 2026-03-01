import { useState, useCallback } from 'react'

/**
 * Hook que sincroniza un Set<string> con un query param en la URL.
 * Usa history.replaceState para no agregar entradas al historial.
 *
 * URL resultante: ?formas=Efectivo,Crédito&conceptos=Comida
 */
export function useSetQueryParam(key: string): [Set<string>, (next: Set<string>) => void] {
  const [value, setValue] = useState<Set<string>>(() => {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get(key)
    return raw ? new Set(raw.split(',').filter(Boolean)) : new Set()
  })

  const setValueAndUrl = useCallback(
    (next: Set<string>) => {
      setValue(next)

      const params = new URLSearchParams(window.location.search)
      if (next.size === 0) {
        params.delete(key)
      } else {
        params.set(key, [...next].join(','))
      }

      const qs = params.toString()
      const newUrl = `${window.location.pathname}${qs ? '?' + qs : ''}`
      window.history.replaceState(null, '', newUrl)
    },
    [key],
  )

  return [value, setValueAndUrl]
}
