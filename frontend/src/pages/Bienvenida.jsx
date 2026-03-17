import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Bienvenida() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!location.state?.fromAuth) {
      navigate('/dashboard', { replace: true })
    }
  }, [location, navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12">
      <div className="max-w-sm w-full mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">La Balanza</h1>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">¡Bienvenido!</h2>
        <p className="text-gray-600 text-base mb-10">
          Ya cargamos los 25 cortes de res para que empieces ahora mismo.
        </p>
        <button
          onClick={() => navigate('/nueva-compra')}
          className="w-full bg-gray-900 text-white rounded-lg px-4 py-3 text-base font-medium min-h-[44px]"
        >
          Empezar
        </button>
      </div>
    </div>
  )
}
