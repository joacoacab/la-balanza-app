import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { api } from '../api/client'
import CompraForm from '../components/CompraForm'
import CompraResumen from '../components/CompraResumen'
import CortesTable from '../components/CortesTable'

export default function NuevaCompra() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  // null = cargando, true/false = resultado del chequeo
  const [tieneCortes, setTieneCortes] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | result
  const [compra, setCompra] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.cortes
      .listar()
      .then((cortes) => setTieneCortes(cortes.length > 0))
      .catch((err) => {
        if (err.status === 401) navigate('/')
        else setTieneCortes(false)
      })
  }, [navigate])

  async function handleSubmit(formData) {
    setStatus('loading')
    setError(null)
    try {
      const fecha = new Date().toISOString().slice(0, 10)
      const creada = await api.compras.crear({ fecha, ...formData })
      const detalle = await api.compras.detalle(creada.id)
      setCompra(detalle)
      setStatus('result')
    } catch (err) {
      if (err.status === 401) {
        navigate('/')
        return
      }
      if (err.status === 400) {
        const msgs = err.data?.non_field_errors
        setError(msgs ? msgs[0] : 'Error en los datos ingresados.')
      } else {
        setError('Error de conexión. Verificá tu red e intentá de nuevo.')
      }
      setStatus('idle')
    }
  }

  function handleNuevaCompra() {
    setCompra(null)
    setError(null)
    setStatus('idle')
  }

  if (tieneCortes === null) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-8">
        <div className="max-w-sm mx-auto">
          <Header onLogout={logout} />
          <p className="text-gray-500 text-base mt-8">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!tieneCortes) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-8">
        <div className="max-w-sm mx-auto">
          <Header onLogout={logout} />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Sin cortes configurados
          </h2>
          <p className="text-gray-600 text-base">
            Todavía no configuraste ningún corte. Los cortes determinan los
            precios de venta.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'result') {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-8">
        <div className="max-w-sm mx-auto">
          <button
            onClick={handleNuevaCompra}
            className="text-base text-gray-700 font-medium mb-6 flex items-center gap-1 min-h-[44px]"
          >
            ← Nueva compra
          </button>
          <CompraResumen compra={compra} />
          <CortesTable cortes={compra.cortes} />
          <button
            onClick={handleNuevaCompra}
            className="w-full mt-6 bg-gray-900 text-white rounded-lg px-4 py-3 text-base font-medium min-h-[44px]"
          >
            Nueva compra
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="max-w-sm mx-auto">
        <Header onLogout={logout} />
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Nueva compra
        </h2>
        <CompraForm
          onSubmit={handleSubmit}
          loading={status === 'loading'}
          serverError={error}
        />
      </div>
    </div>
  )
}

function Header({ onLogout }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <h1 className="text-2xl font-bold text-gray-900">La Balanza</h1>
      <button
        onClick={onLogout}
        className="text-sm text-gray-500 underline min-h-[44px] px-2"
      >
        Salir
      </button>
    </div>
  )
}
