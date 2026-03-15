import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export default function AppLayout() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">La Balanza</h1>
        <button
          onClick={logout}
          className="text-sm text-gray-500 underline min-h-[44px] px-2"
        >
          Salir
        </button>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
