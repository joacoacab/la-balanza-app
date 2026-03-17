import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const CICLOS = ['mensual', 'trimestral', 'anual']
const DIAS = [30, 90, 365]

function fechaLocal(isoDate) {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function calcularNuevaFecha(fechaVencimiento, estado, dias) {
  const base =
    fechaVencimiento && estado === 'activa'
      ? new Date(fechaVencimiento + 'T00:00:00')
      : new Date()
  base.setDate(base.getDate() + dias)
  return base.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function AdminClienteDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [cliente, setCliente] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  const [cicloAsignar, setCicloAsignar] = useState('anual')
  const [fechaVencAsignar, setFechaVencAsignar] = useState('')

  const [diasExtender, setDiasExtender] = useState(30)

  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false)

  useEffect(() => {
    cargarCliente()
  }, [id])

  function cargarCliente() {
    setCargando(true)
    api.admin
      .clienteDetalle(id)
      .then((data) => {
        setCliente(data)
        setErrorCarga(null)
      })
      .catch((e) => {
        setErrorCarga(e.status === 404 ? 'Cliente no encontrado.' : 'Error al cargar el cliente.')
      })
      .finally(() => setCargando(false))
  }

  async function ejecutarAccion(body) {
    try {
      await api.admin.clienteSuscripcion(id, body)
      mostrarMensaje('Suscripción actualizada correctamente.')
      setConfirmandoCancelar(false)
      cargarCliente()
    } catch (e) {
      mostrarMensaje(e.data?.error || 'Error al actualizar la suscripción.')
    }
  }

  function mostrarMensaje(texto) {
    setMensaje(texto)
    setTimeout(() => setMensaje(null), 3000)
  }

  if (cargando) return <div className="px-6 py-8 text-gray-500">Cargando...</div>
  if (errorCarga) return <div className="px-6 py-8 text-red-500">{errorCarga}</div>

  const s = cliente.suscripcion
  const nuevaFechaExtender = calcularNuevaFecha(s.fecha_vencimiento, s.estado, diasExtender)

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/admin-saas/')}
        className="text-base text-gray-700 font-medium mb-6 flex items-center gap-1 min-h-[44px]"
      >
        ← Volver a clientes
      </button>

      {/* Info del cliente */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-1">{cliente.nombre}</h2>
        <p className="text-sm text-gray-500">
          {cliente.usuario_email} · Registrado: {cliente.fecha_registro}
        </p>
      </div>

      {/* Suscripción */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Suscripción
        </h3>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-gray-500">Plan</span>
          <span className="font-semibold uppercase">{s.plan}</span>
          <span className="text-gray-500">Ciclo</span>
          <span className="capitalize">{s.ciclo ?? '—'}</span>
          <span className="text-gray-500">Estado</span>
          <span className="capitalize">{s.estado}</span>
          <span className="text-gray-500">Vencimiento</span>
          <span>{s.fecha_vencimiento ? fechaLocal(s.fecha_vencimiento) : '—'}</span>
        </div>
      </div>

      {mensaje && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 mb-4">
          {mensaje}
        </div>
      )}

      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Acciones
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Asignar Pro */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="font-medium text-gray-900 mb-3">Asignar Pro</h4>
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Ciclo</label>
              <select
                value={cicloAsignar}
                onChange={(e) => setCicloAsignar(e.target.value)}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
              >
                {CICLOS.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Fecha de vencimiento</label>
              <input
                type="date"
                value={fechaVencAsignar}
                onChange={(e) => setFechaVencAsignar(e.target.value)}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <button
            onClick={() =>
              ejecutarAccion({
                accion: 'asignar_pro',
                ciclo: cicloAsignar,
                fecha_vencimiento: fechaVencAsignar,
              })
            }
            disabled={!fechaVencAsignar}
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium min-h-[40px] disabled:opacity-40"
          >
            Confirmar
          </button>
        </div>

        {/* Extender */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="font-medium text-gray-900 mb-3">Extender vencimiento</h4>
          <div className="space-y-1.5 mb-3">
            {DIAS.map((d) => (
              <label key={d} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dias_extender"
                  checked={diasExtender === d}
                  onChange={() => setDiasExtender(d)}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">+{d} días</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Nuevo vencimiento:{' '}
            <span className="font-medium text-gray-700">{nuevaFechaExtender}</span>
          </p>
          <button
            onClick={() => ejecutarAccion({ accion: 'extender', dias: diasExtender })}
            className="w-full bg-gray-800 text-white rounded-lg py-2 text-sm font-medium min-h-[40px]"
          >
            Confirmar
          </button>
        </div>
      </div>

      {/* Cancelar suscripción */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <h4 className="font-medium text-red-800 mb-1">⚠ Cancelar suscripción</h4>
        <p className="text-sm text-red-700 mb-3">
          Esto setea el plan a Free y estado a cancelado.
        </p>
        {!confirmandoCancelar ? (
          <button
            onClick={() => setConfirmandoCancelar(true)}
            className="text-sm text-red-700 border border-red-300 rounded-lg px-4 py-2 min-h-[40px]"
          >
            Cancelar suscripción
          </button>
        ) : (
          <div>
            <p className="text-sm font-medium text-red-800 mb-3">
              ¿Confirmar cancelación? El cliente quedará en plan Free de inmediato y no podrá
              crear compras de cerdo ni pollo.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmandoCancelar(false)}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm min-h-[40px]"
              >
                No, volver
              </button>
              <button
                onClick={() => ejecutarAccion({ accion: 'cancelar' })}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium min-h-[40px]"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
