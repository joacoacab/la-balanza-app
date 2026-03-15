import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { api } from '../api/client'
import { AuthContext } from '../auth/AuthContext'
import CompraForm from '../components/CompraForm'
import CompraResumen from '../components/CompraResumen'
import CortesTable from '../components/CortesTable'
import { generarListaPreciosPdf } from '../utils/generarListaPreciosPdf'

function VolverBtn() {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(-1)}
      className="text-base text-gray-700 font-medium mb-6 flex items-center gap-1 min-h-[44px]"
    >
      ← Volver
    </button>
  )
}

export default function NuevaCompra() {
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)

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
      <div className="px-6 py-8">
        <div className="max-w-sm mx-auto">
          <VolverBtn />
          <p className="text-gray-500 text-base">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!tieneCortes) {
    return (
      <div className="px-6 py-8">
        <div className="max-w-sm mx-auto">
          <VolverBtn />
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
      <div className="px-6 py-8">
        <div className="max-w-sm mx-auto">
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-4 py-3 text-base font-medium min-h-[44px]"
            >
              ← Menú
            </button>
            <button
              onClick={handleNuevaCompra}
              className="flex-1 bg-gray-900 text-white rounded-lg px-4 py-3 text-base font-medium min-h-[44px]"
            >
              Nueva compra
            </button>
          </div>
          <CompraResumen compra={compra} />
          <CortesTable cortes={compra.cortes} />
          <button
            onClick={() => generarListaPreciosPdf({ nombreCarniceria: user?.username ?? '', compra })}
            className="w-full mt-4 border border-gray-300 text-gray-700 rounded-lg px-4 py-3 text-base font-medium min-h-[44px] flex items-center justify-center gap-2"
          >
            <Printer size={18} />
            Imprimir lista de precios
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-8">
      <div className="max-w-sm mx-auto">
        <VolverBtn />
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
