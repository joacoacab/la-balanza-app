import { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { api } from '../api/client'
import { AuthContext } from '../auth/AuthContext'
import CompraResumen from '../components/CompraResumen'
import CortesTable from '../components/CortesTable'
import { generarListaPreciosPdf } from '../utils/generarListaPreciosPdf'

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function formatFecha(iso) {
  const [anio, mes, dia] = iso.split('-')
  return `${parseInt(dia)} ${MESES[parseInt(mes) - 1]} ${anio}`
}

export default function HistorialDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)
  const [compra, setCompra] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.compras
      .detalle(id)
      .then(setCompra)
      .catch((err) => {
        if (err.status === 401) navigate('/')
        else if (err.status === 404) setError('Compra no encontrada.')
        else setError('Error al cargar el detalle.')
      })
  }, [id, navigate])

  return (
    <div className="px-6 py-8">
      <div className="max-w-sm mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-base text-gray-700 font-medium mb-6 flex items-center gap-1 min-h-[44px]"
        >
          ← Volver
        </button>

        {error && (
          <p className="text-red-700 text-base">{error}</p>
        )}

        {!error && compra === null && (
          <p className="text-gray-500 text-base">Cargando...</p>
        )}

        {compra && (
          <>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {formatFecha(compra.fecha)}
            </h2>
            <CompraResumen compra={compra} />
            <CortesTable cortes={compra.cortes} />
            <button
              onClick={() => generarListaPreciosPdf({ nombreCarniceria: user?.username ?? '', compra })}
              className="w-full mt-4 border border-gray-300 text-gray-700 rounded-lg px-4 py-3 text-base font-medium min-h-[44px] flex items-center justify-center gap-2"
            >
              <Printer size={18} />
              Imprimir lista de precios
            </button>
          </>
        )}
      </div>
    </div>
  )
}
