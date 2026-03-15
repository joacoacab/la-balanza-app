import { useNavigate } from 'react-router-dom'
import { Calculator, Beef, ClipboardList, TrendingUp } from 'lucide-react'
import { useAuth } from '../auth/useAuth'

const CARDS = [
  {
    label: 'Nueva Compra',
    to: '/nueva-compra',
    icon: Calculator,
    description: 'Calculá el costo por corte',
  },
  {
    label: 'Mis Cortes',
    to: '/cortes',
    icon: Beef,
    description: 'Administrá tus cortes',
  },
  {
    label: 'Historial',
    to: '/historial',
    icon: ClipboardList,
    description: 'Revisá compras anteriores',
  },
  {
    label: 'Precios de hoy',
    to: '/precios',
    icon: TrendingUp,
    description: 'Precios de la última compra',
  },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div className="px-6 py-8">
      <div className="max-w-sm mx-auto">
        <p className="text-gray-500 text-base mb-8">
          Hola, {user?.username}
        </p>

        <div className="space-y-4">
          {CARDS.map(({ label, to, icon: Icon, description }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="w-full bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4 text-left min-h-[72px] active:bg-gray-50"
            >
              <div className="bg-gray-100 rounded-lg p-3 shrink-0">
                <Icon size={24} className="text-gray-700" />
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">{label}</p>
                <p className="text-sm text-gray-500">{description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
