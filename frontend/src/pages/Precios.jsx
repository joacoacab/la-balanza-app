import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import CompraResumen from '../components/CompraResumen'
import CortesTable from '../components/CortesTable'

export default function Precios() {
  const navigate = useNavigate()
  const [compra, setCompra] = useState(null)
  const [sinCompras, setSinCompras] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.compras
      .listar()
      .then((lista) => {
        if (lista.length === 0) {
          setSinCompras(true)
          return
        }
        return api.compras.detalle(lista[0].id).then(setCompra)
      })
      .catch((err) => {
        if (err.status === 401) navigate('/')
        else setError('Error al cargar los precios. Verificá tu red.')
      })
  }, [navigate])

  return (
    <div className="px-6 py-8">
      <div className="max-w-sm mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-base text-gray-700 font-medium mb-6 flex items-center gap-1 min-h-[44px]"
        >
          ← Volver
        </button>

        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Precios de hoy
        </h2>

        {!compra && !sinCompras && !error && (
          <p className="text-gray-500 text-base">Cargando...</p>
        )}

        {error && (
          <p className="text-red-700 text-base">{error}</p>
        )}

        {sinCompras && (
          <p className="text-gray-500 text-base">
            Todavía no registraste ninguna compra. Hacé tu primera compra para
            ver los precios.
          </p>
        )}

        {compra && (
          <>
            <CompraResumen compra={compra} />
            <CortesTable cortes={compra.cortes} />
          </>
        )}
      </div>
    </div>
  )
}
