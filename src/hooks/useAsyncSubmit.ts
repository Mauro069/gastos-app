import { useState } from 'react'

export function useAsyncSubmit(errorMsg = 'Error al guardar') {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const execute = async (fn: () => Promise<void>) => {
    setLoading(true)
    setError('')
    try {
      await fn()
    } catch {
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, setError, execute }
}
