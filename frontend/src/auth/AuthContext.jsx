import { createContext, useState } from 'react'
import { api, setToken, clearToken } from '../api/client'

export const AuthContext = createContext(null)

const SESSION_KEY = 'lb_token'

// localStorage: persiste entre pestañas y reinicios del browser.
// Decisión de diseño: la app usa TokenAuthentication con Authorization header
// (no cookie), por lo que no hay riesgo CSRF. Para un app B2B de uso diario
// en móvil, la UX de "seguir logueado" tiene más valor que la protección
// adicional de sessionStorage (que solo cubriría XSS del mismo origen, ya
// mitigado por la política de mismo origen del bundle de Vite/Nginx).
function restoreSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveSession(token, user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }))
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

const saved = restoreSession()
if (saved?.token) {
  setToken(saved.token)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(saved?.user ?? null)

  async function registrar(datos) {
    const { token, es_primera_vez, is_staff } = await api.auth.registro(datos)
    const u = { username: datos.username, is_staff }
    setToken(token)
    setUser(u)
    saveSession(token, u)
    return { es_primera_vez, is_staff }
  }

  async function login(username, password) {
    const { token, is_staff } = await api.auth.login(username, password)
    const u = { username, is_staff }
    setToken(token)
    setUser(u)
    saveSession(token, u)
    return is_staff
  }

  async function loginConGoogle(idToken) {
    const { token, username, es_primera_vez, is_staff } = await api.auth.google(idToken)
    const u = { username, is_staff }
    setToken(token)
    setUser(u)
    saveSession(token, u)
    return { es_primera_vez, is_staff }
  }

  async function logout() {
    await api.auth.logout().catch(() => {})
    clearToken()
    clearSession()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, registrar, login, logout, loginConGoogle }}>
      {children}
    </AuthContext.Provider>
  )
}
