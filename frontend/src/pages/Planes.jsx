import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useSuscripcion } from '../hooks/useSuscripcion'

const CICLOS_BASE = [
  { valor: 'mensual',    label: 'Mensual',     precioFallback: '80000' },
  { valor: 'trimestral', label: 'Trimestral',  precioFallback: '210000' },
  { valor: 'anual',      label: 'Anual',       precioFallback: '720000' },
]

export default function Planes() {
  const navigate = useNavigate()
  const { suscripcion, loading } = useSuscripcion()
  const [cicloSeleccionado, setCicloSeleccionado] = useState('anual')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [preciosDB, setPreciosDB] = useState(null)
  const [preciosCargando, setPreciosCargando] = useState(true)

  useEffect(() => {
    api.billing
      .precios()
      .then(setPreciosDB)
      .catch(() => setPreciosDB(false))
      .finally(() => setPreciosCargando(false))
  }, [])

  function getPrecio(valorCiclo) {
    if (preciosCargando) return '---'
    if (!preciosDB) {
      const fallback = CICLOS_BASE.find((c) => c.valor === valorCiclo)
      return `$${Number(fallback.precioFallback).toLocaleString('es-AR')}`
    }
    const entry = preciosDB.find((p) => p.ciclo === valorCiclo)
    return entry ? `$${Number(entry.precio).toLocaleString('es-AR')}` : '---'
  }

  async function handleSuscribir() {
    setEnviando(true)
    setError(null)
    try {
      const { init_point } = await api.billing.suscribir(cicloSeleccionado)
      const url = new URL(init_point)
      if (url.searchParams.get('mock') === 'true') {
        const params = url.searchParams.toString()
        navigate(`/planes/confirmacion?${params}`)
      } else {
        window.location.href = init_point
      }
    } catch (e) {
      setError(e.data?.mensaje || 'Ocurrió un error. Intentá de nuevo.')
      setEnviando(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-gray-500">Cargando...</div>
  }

  const esPro = suscripcion?.plan === 'pro' && suscripcion?.estado === 'activa'

  return (
    <div className="px-6 py-8">
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-base text-gray-700 font-medium mb-6 flex items-center gap-1 min-h-[44px]"
        >
          ← Volver
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-1">Mi plan</h2>
        <p className="text-sm text-gray-500 mb-6">
          Plan actual:{' '}
          <span className="font-semibold uppercase">{suscripcion?.plan ?? 'free'}</span>
        </p>

        {esPro ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="font-semibold text-gray-900 text-lg mb-2">Plan Pro activo ✓</p>
            {suscripcion.ciclo && (
              <p className="text-sm text-gray-600">
                Ciclo: <span className="capitalize">{suscripcion.ciclo}</span>
              </p>
            )}
            {suscripcion.fecha_vencimiento && (
              <p className="text-sm text-gray-600">
                Próximo vencimiento:{' '}
                {new Date(suscripcion.fecha_vencimiento + 'T00:00:00').toLocaleDateString(
                  'es-AR',
                  { day: 'numeric', month: 'long', year: 'numeric' }
                )}
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Plan Free */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
              <h3 className="font-bold text-gray-600 text-lg mb-3">FREE</h3>
              <ul className="text-sm text-gray-500 space-y-1 mb-4">
                <li>• Solo res</li>
                <li>• Últimas 5 compras</li>
                <li>• Sin PDF</li>
              </ul>
              <p className="text-sm font-medium text-gray-400">Tu plan actual</p>
            </div>

            {/* Plan Pro */}
            <div className="bg-white border-2 border-blue-500 rounded-xl p-5">
              <h3 className="font-bold text-blue-700 text-lg mb-3">PRO</h3>
              <ul className="text-sm text-gray-600 space-y-1 mb-4">
                <li>• Res, cerdo y pollo</li>
                <li>• Historial completo</li>
                <li>• PDF ilimitados</li>
              </ul>

              <div className="space-y-2 mb-4">
                {CICLOS_BASE.map((c) => (
                  <label key={c.valor} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="ciclo"
                      value={c.valor}
                      checked={cicloSeleccionado === c.valor}
                      onChange={() => setCicloSeleccionado(c.valor)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">
                      {c.label}{' '}
                      <span className="font-semibold">{getPrecio(c.valor)}</span> ARS
                    </span>
                  </label>
                ))}
              </div>

              {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

              <button
                onClick={handleSuscribir}
                disabled={enviando}
                className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold min-h-[44px] disabled:opacity-50"
              >
                {enviando ? 'Procesando...' : 'Suscribirme'}
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4">Los precios son en ARS e incluyen IVA.</p>
      </div>
    </div>
  )
}
