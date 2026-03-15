import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'

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

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function formatFecha(iso) {
  const [anio, mes, dia] = iso.split('-')
  return `${parseInt(dia)} ${MESES[parseInt(mes) - 1]} ${anio}`
}

function fmtNum(val, opts = {}) {
  if (val == null) return '-'
  const n = parseFloat(val)
  if (isNaN(n)) return '-'
  return n.toLocaleString('es-AR', opts)
}

export default function Historial() {
  const navigate = useNavigate()
  const [compras, setCompras] = useState(null)
  const [error, setError] = useState(null)

  function cargar() {
    setError(null)
    setCompras(null)
    api.compras
      .listar()
      .then(setCompras)
      .catch((err) => {
        if (err.status === 401) navigate('/')
        else setError('Error al cargar el historial. Verificá tu red.')
      })
  }

  useEffect(() => {
    cargar()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="px-6 py-8">
      <div className="max-w-sm mx-auto">
        <VolverBtn />
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Historial</h2>

        {compras === null && !error && (
          <p className="text-gray-500 text-base">Cargando...</p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 text-base mb-3">{error}</p>
            <button
              onClick={cargar}
              className="w-full border border-red-300 text-red-700 rounded-lg px-4 py-3 text-base font-medium min-h-[44px]"
            >
              Reintentar
            </button>
          </div>
        )}

        {compras !== null && compras.length === 0 && (
          <p className="text-gray-500 text-base">
            Todavía no registraste ninguna compra.
          </p>
        )}

        {compras !== null && compras.length > 0 && (
          <div className="space-y-3">
            {compras.map((compra) => (
              <Link
                key={compra.id}
                to={`/historial/${compra.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base font-medium text-gray-900">
                    {formatFecha(compra.fecha)}
                  </span>
                  <span className="text-gray-400 text-lg">→</span>
                </div>
                <p className="text-sm text-gray-500">
                  {fmtNum(compra.peso_media_res, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg · ${fmtNum(compra.precio_kg)}/kg
                </p>
                <p className="text-sm text-gray-700 mt-1">
                  Total: ${fmtNum(compra.costo_total)}
                </p>
                <p className="text-sm text-gray-700">
                  Neto: ${fmtNum(compra.costo_neto)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
