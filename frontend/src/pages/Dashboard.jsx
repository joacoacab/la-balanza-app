import { useAuth } from '../auth/useAuth'

export default function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">La Balanza</h1>
          <button
            onClick={logout}
            className="text-sm text-gray-500 underline min-h-[44px] px-2"
          >
            Salir
          </button>
        </div>

        <p className="text-gray-700 text-base">
          Bienvenido, <span className="font-medium">{user?.username}</span>.
        </p>
      </div>
    </div>
  )
}
