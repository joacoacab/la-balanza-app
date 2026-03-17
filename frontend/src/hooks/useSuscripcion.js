import { useState, useEffect } from 'react'
import { api } from '../api/client'

export function useSuscripcion() {
  const [suscripcion, setSuscripcion] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.billing
      .estado()
      .then(setSuscripcion)
      .catch(() => setSuscripcion(null))
      .finally(() => setLoading(false))
  }, [])

  return { suscripcion, loading }
}
