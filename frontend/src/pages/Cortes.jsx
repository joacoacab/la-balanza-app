import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { api } from '../api/client'
import CorteCard from '../components/CorteCard'
import CorteFormModal from '../components/CorteFormModal'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Cortes() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [cortes, setCortes] = useState(null)       // null = cargando
  const [errorCarga, setErrorCarga] = useState(null)
  const [modal, setModal] = useState(null)          // null | {tipo, corte?}
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState(null)

  const cargarCortes = useCallback(() => {
    setErrorCarga(null)
    setCortes(null)
    api.cortes
      .listar()
      .then(setCortes)
      .catch((err) => {
        if (err.status === 401) navigate('/')
        else setErrorCarga('Error al cargar cortes. Verificá tu red.')
      })
  }, [navigate])

  useEffect(() => {
    cargarCortes()
  }, [cargarCortes])

  function abrirAgregar() {
    setErrorModal(null)
    setModal({ tipo: 'agregar' })
  }

  function abrirEditar(corte) {
    setErrorModal(null)
    setModal({ tipo: 'editar', corte })
  }

  function abrirConfirmar(corte) {
    setErrorModal(null)
    setModal({ tipo: 'confirmar', corte })
  }

  function cerrarModal() {
    setModal(null)
    setErrorModal(null)
  }

  async function handleGuardar(datos) {
    setGuardando(true)
    setErrorModal(null)
    try {
      if (modal.tipo === 'agregar') {
        const nuevo = await api.cortes.crear(datos)
        setCortes((prev) => [nuevo, ...prev])
      } else {
        const actualizado = await api.cortes.editar(modal.corte.id, datos)
        setCortes((prev) =>
          prev.map((c) => (c.id === actualizado.id ? actualizado : c))
        )
      }
      cerrarModal()
    } catch (err) {
      if (err.status === 401) { navigate('/'); return }
      if (err.status === 404) { cargarCortes(); cerrarModal(); return }
      if (err.status === 400 && err.data?.nombre) {
        setErrorModal('Ya existe un corte con ese nombre.')
      } else if (err.status === 400) {
        setErrorModal('Error en los datos ingresados.')
      } else {
        setErrorModal('Error de conexión. Intentá de nuevo.')
      }
    } finally {
      setGuardando(false)
    }
  }

  async function handleDesactivar() {
    setGuardando(true)
    setErrorModal(null)
    try {
      await api.cortes.desactivar(modal.corte.id)
      setCortes((prev) => prev.filter((c) => c.id !== modal.corte.id))
      cerrarModal()
    } catch (err) {
      if (err.status === 401) { navigate('/'); return }
      if (err.status === 404) {
        setCortes((prev) => prev.filter((c) => c.id !== modal.corte.id))
        cerrarModal()
        return
      }
      setErrorModal('Error de conexión. Intentá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

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

        <h2 className="text-xl font-semibold text-gray-900 mb-6">Mis cortes</h2>

        {/* Cargando */}
        {cortes === null && !errorCarga && (
          <p className="text-gray-500 text-base">Cargando...</p>
        )}

        {/* Error de carga */}
        {errorCarga && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 text-base mb-3">{errorCarga}</p>
            <button
              onClick={cargarCortes}
              className="w-full border border-red-300 text-red-700 rounded-lg px-4 py-3 text-base font-medium min-h-[44px]"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Lista */}
        {cortes !== null && (
          <>
            {cortes.length === 0 && (
              <p className="text-gray-500 text-base mb-6">
                Todavía no agregaste ningún corte.
              </p>
            )}

            <div className="space-y-3 mb-4">
              {cortes.map((corte) => (
                <CorteCard
                  key={corte.id}
                  corte={corte}
                  onEditar={abrirEditar}
                  onDesactivar={abrirConfirmar}
                />
              ))}
            </div>

            <button
              onClick={abrirAgregar}
              className="w-full border border-gray-300 text-gray-700 rounded-lg px-4 py-3 text-base font-medium min-h-[44px]"
            >
              + Agregar corte
            </button>
          </>
        )}
      </div>

      {/* Modales */}
      {(modal?.tipo === 'agregar' || modal?.tipo === 'editar') && (
        <CorteFormModal
          corte={modal.tipo === 'editar' ? modal.corte : null}
          onGuardar={handleGuardar}
          onCancelar={cerrarModal}
          guardando={guardando}
          error={errorModal}
        />
      )}

      {modal?.tipo === 'confirmar' && (
        <ConfirmDialog
          nombre={modal.corte.nombre}
          onConfirmar={handleDesactivar}
          onCancelar={cerrarModal}
          guardando={guardando}
        />
      )}
    </div>
  )
}
