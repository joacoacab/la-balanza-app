import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Beef, Ham, Bird } from 'lucide-react'
import { api } from '../api/client'

const ANIMALES = [
  { id: 'res',   label: 'Res',   Icon: Beef, fijo: true },
  { id: 'cerdo', label: 'Cerdo', Icon: Ham,  fijo: false },
  { id: 'pollo', label: 'Pollo', Icon: Bird, fijo: false },
]

export default function Bienvenida() {
  const navigate = useNavigate()
  const location = useLocation()
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!location.state?.fromAuth) {
      navigate('/dashboard', { replace: true })
    }
  }, [location, navigate])

  function toggleAnimal(id) {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleEmpezar() {
    if (seleccionados.size === 0) {
      navigate('/nueva-compra')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await Promise.all([...seleccionados].map((animal) => api.cortes.cargarPlantilla(animal)))
      navigate('/nueva-compra')
    } catch {
      setError('Error al cargar los cortes. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12">
      <div className="max-w-sm w-full mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">La Balanza</h1>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">¡Bienvenido!</h2>
        <p className="text-gray-600 text-base mb-8">
          Res ya está listo. ¿Con qué otros animales trabajás?
        </p>

        <div className="flex gap-3 mb-8">
          {ANIMALES.map(({ id, label, Icon, fijo }) => {
            const activo = fijo || seleccionados.has(id)
            return (
              <button
                key={id}
                type="button"
                disabled={fijo || loading}
                onClick={() => !fijo && toggleAnimal(id)}
                className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-colors ${
                  activo
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-500'
                } ${fijo ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <Icon size={28} />
                <span className="text-sm font-medium">{label}</span>
              </button>
            )
          })}
        </div>

        {error && (
          <p className="text-red-600 text-sm mb-4">{error}</p>
        )}

        <button
          onClick={handleEmpezar}
          disabled={loading}
          className="w-full bg-gray-900 text-white rounded-lg px-4 py-3 text-base font-medium min-h-[44px] disabled:opacity-50"
        >
          {loading ? 'Cargando...' : 'Empezar'}
        </button>
      </div>
    </div>
  )
}
