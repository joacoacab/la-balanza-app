import { useEffect, useState } from 'react'
import { api } from '../api/client'

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function TabMetricas({ stats }) {
  const retencion =
    stats.tasa_retencion_30_dias !== null && stats.tasa_retencion_30_dias !== undefined
      ? `${stats.tasa_retencion_30_dias}%`
      : '—'

  return (
    <div className="grid grid-cols-2 gap-4">
      <StatCard label="Clientes registrados" value={stats.total_clientes} />
      <StatCard label="Activos esta semana" value={stats.activos_7_dias} />
      <StatCard label="Nuevos este mes" value={stats.nuevos_este_mes} />
      <StatCard
        label="Tasa de retención"
        value={retencion}
        sub="últimos 30 días"
      />
      <StatCard
        label="MRR"
        value="$ —"
        sub="Próximamente"
      />
      <StatCard
        label="Clientes por plan"
        value={`Free: ${stats.total_clientes}`}
        sub="Pro: 0"
      />
    </div>
  )
}

function TabClientes({ clientes }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="py-3 pr-4 font-medium">Nombre</th>
            <th className="py-3 pr-4 font-medium">Email</th>
            <th className="py-3 pr-4 font-medium">Registro</th>
            <th className="py-3 pr-4 font-medium">Plan</th>
            <th className="py-3 pr-4 font-medium">Última actividad</th>
            <th className="py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id} className="border-b border-gray-100">
              <td className="py-3 pr-4 font-medium text-gray-900">{c.nombre}</td>
              <td className="py-3 pr-4 text-gray-600">{c.usuario_email}</td>
              <td className="py-3 pr-4 text-gray-600">{c.fecha_registro}</td>
              <td className="py-3 pr-4">
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                  Free
                </span>
              </td>
              <td className="py-3 pr-4 text-gray-600">
                {c.ultima_actividad ?? '—'}
              </td>
              <td className="py-3">
                <button
                  disabled
                  className="text-xs text-gray-400 border border-gray-200 rounded px-3 py-1 cursor-not-allowed"
                >
                  Ver detalle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {clientes.length === 0 && (
        <p className="text-center text-gray-400 py-8">Sin clientes registrados.</p>
      )}
    </div>
  )
}

export default function AdminPanel() {
  const [tab, setTab] = useState('metricas')
  const [stats, setStats] = useState(null)
  const [clientes, setClientes] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accesoDenegado, setAccesoDenegado] = useState(false)

  useEffect(() => {
    Promise.all([api.admin.stats(), api.admin.carniceria()])
      .then(([statsData, clientesData]) => {
        setStats(statsData)
        setClientes(clientesData)
      })
      .catch((err) => {
        if (err.status === 403 || err.status === 401) {
          setAccesoDenegado(true)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  if (accesoDenegado) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500 font-medium">Acceso denegado.</p>
      </div>
    )
  }

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Panel Admin</h1>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { id: 'metricas', label: 'Métricas' },
          { id: 'clientes', label: 'Clientes' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'metricas' && <TabMetricas stats={stats} />}
      {tab === 'clientes' && <TabClientes clientes={clientes} />}
    </div>
  )
}
