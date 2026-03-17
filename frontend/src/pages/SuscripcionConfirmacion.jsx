import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

const MAX_INTENTOS = 10
const INTERVALO_MS = 2000

export default function SuscripcionConfirmacion() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const esMock = searchParams.get('mock') === 'true'

  const [estado, setEstado] = useState(null)
  const [intentos, setIntentos] = useState(0)

  useEffect(() => {
    if (esMock) return

    let cancelado = false

    function verificar(intento) {
      api.billing
        .estado()
        .then((data) => {
          if (cancelado) return
          setEstado(data)
          if (data.plan === 'pro' && data.estado === 'activa') return
          if (intento < MAX_INTENTOS) {
            setTimeout(() => verificar(intento + 1), INTERVALO_MS)
          } else {
            setIntentos(MAX_INTENTOS)
          }
        })
        .catch(() => {})
    }

    verificar(0)
    return () => { cancelado = true }
  }, [esMock])

  if (esMock) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <p className="text-4xl mb-4">✓</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Suscripción activada correctamente (modo prueba)
          </h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-6 bg-blue-600 text-white rounded-lg px-8 py-3 text-sm font-semibold min-h-[44px]"
          >
            Ir al dashboard
          </button>
        </div>
      </div>
    )
  }

  const esPro = estado?.plan === 'pro' && estado?.estado === 'activa'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        {!estado && (
          <p className="text-gray-500">Verificando tu suscripción...</p>
        )}

        {estado && esPro && (
          <div>
            <p className="text-4xl mb-4">✓</p>
            <h2 className="text-xl font-bold text-gray-900 mb-2">¡Suscripción activa!</h2>
            <p className="text-sm text-gray-600 mb-6">
              Ya podés usar todas las funciones de La Balanza Pro.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-blue-600 text-white rounded-lg px-8 py-3 text-sm font-semibold min-h-[44px]"
            >
              Ir al inicio
            </button>
          </div>
        )}

        {estado && !esPro && intentos >= MAX_INTENTOS && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Procesando pago...</h2>
            <p className="text-sm text-gray-600 mb-6">
              Estamos verificando tu pago. Puede demorar unos minutos en acreditarse.
            </p>
            <button
              onClick={() => navigate('/planes')}
              className="text-sm text-blue-600 underline"
            >
              Volver a planes
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
