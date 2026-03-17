import { useState, useEffect, useRef, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { AuthContext } from '../auth/AuthContext'

const DEFAULTS = {
  nombre_carniceria: '',
  username: '',
  password: '',
  password_confirm: '',
}

export default function Registro() {
  const { registrar } = useAuth()
  const { loginConGoogle } = useContext(AuthContext)
  const navigate = useNavigate()
  const [form, setForm] = useState(DEFAULTS)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const googleBtnRef = useRef(null)
  const googleCallbackRef = useRef(null)

  async function handleGoogleCallback(response) {
    setError(null)
    setLoading(true)
    try {
      const { es_primera_vez, is_staff } = await loginConGoogle(response.credential)
      const destino = is_staff ? '/admin-saas/' : es_primera_vez ? '/bienvenida' : '/dashboard'
      navigate(destino, { state: { fromAuth: true } })
    } catch {
      setError('No se pudo iniciar sesión con Google.')
    } finally {
      setLoading(false)
    }
  }

  googleCallbackRef.current = handleGoogleCallback

  useEffect(() => {
    function initGoogle() {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: (resp) => googleCallbackRef.current(resp),
      })
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        locale: 'es',
        width: googleBtnRef.current?.offsetWidth || 360,
      })
    }

    if (window.google) {
      initGoogle()
    } else {
      window.onGoogleLibraryLoad = initGoogle
    }
  }, [])

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function validate() {
    if (!form.nombre_carniceria.trim()) return 'El nombre de la carnicería es requerido.'
    if (!form.username.trim()) return 'El usuario es requerido.'
    if (/\s/.test(form.username)) return 'El usuario no puede contener espacios.'
    if (!form.password) return 'La contraseña es requerida.'
    if (form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
    if (form.password !== form.password_confirm) return 'Las contraseñas no coinciden.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const localError = validate()
    if (localError) {
      setError(localError)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { es_primera_vez, is_staff } = await registrar({
        nombre_carniceria: form.nombre_carniceria.trim(),
        username: form.username.trim(),
        password: form.password,
        password_confirm: form.password_confirm,
      })
      const destino = is_staff ? '/admin-saas/' : es_primera_vez ? '/bienvenida' : '/dashboard'
      navigate(destino, { state: { fromAuth: true } })
    } catch (err) {
      const data = err.data ?? {}
      if (data.username) {
        setError(data.username[0])
      } else if (data.password) {
        setError(data.password[0])
      } else if (data.non_field_errors) {
        setError(data.non_field_errors[0])
      } else if (data.nombre_carniceria) {
        setError(data.nombre_carniceria[0])
      } else {
        setError('Error de conexión. Verificá tu red e intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center px-6 py-12">
      <div className="max-w-sm w-full mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">La Balanza</h1>
        <p className="text-gray-500 mb-8">Crear cuenta</p>

        <div ref={googleBtnRef} className="w-full mb-4" />

        <div className="flex items-center gap-3 mb-4">
          <hr className="flex-1 border-gray-300" />
          <span className="text-sm text-gray-400">o</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="nombre_carniceria"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nombre de la carnicería
            </label>
            <input
              id="nombre_carniceria"
              type="text"
              disabled={loading}
              value={form.nombre_carniceria}
              onChange={(e) => setField('nombre_carniceria', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="reg-username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Usuario
            </label>
            <input
              id="reg-username"
              type="text"
              autoComplete="username"
              disabled={loading}
              value={form.username}
              onChange={(e) => setField('username', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="reg-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Contraseña
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              disabled={loading}
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="reg-password-confirm"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirmar contraseña
            </label>
            <input
              id="reg-password-confirm"
              type="password"
              autoComplete="new-password"
              disabled={loading}
              value={form.password_confirm}
              onChange={(e) => setField('password_confirm', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-red-700 text-base">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded-lg px-4 py-3 text-base font-medium min-h-[44px] disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tenés cuenta?{' '}
          <Link to="/" className="text-gray-900 underline">
            Ingresar
          </Link>
        </p>
      </div>
    </div>
  )
}
