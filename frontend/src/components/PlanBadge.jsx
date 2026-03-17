import { useSuscripcion } from '../hooks/useSuscripcion'

export default function PlanBadge() {
  const { suscripcion, loading } = useSuscripcion()

  if (loading || !suscripcion) return null

  const esPro = suscripcion.plan === 'pro' && suscripcion.estado === 'activa'

  return (
    <span
      className={`text-xs font-semibold px-2 py-1 rounded-full ${
        esPro ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {esPro ? 'PRO' : 'FREE'}
    </span>
  )
}
