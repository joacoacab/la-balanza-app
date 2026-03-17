// El token vive solo en memoria. Reload = logout (ver deuda técnica en spec 05).
let token = null

export function setToken(t) {
  token = t
}

export function clearToken() {
  token = null
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) {
    headers['Authorization'] = `Token ${token}`
  }

  const res = await fetch(path, { ...options, headers })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = new Error('API error')
    err.status = res.status
    err.data = data
    throw err
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  auth: {
    registro: (datos) =>
      request('/api/v1/auth/registro/', {
        method: 'POST',
        body: JSON.stringify(datos),
      }),
    login: (username, password) =>
      request('/api/v1/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    logout: () =>
      request('/api/v1/auth/logout/', { method: 'POST' }),
    google: (idToken) =>
      request('/api/v1/auth/google/', {
        method: 'POST',
        body: JSON.stringify({ id_token: idToken }),
      }),
  },
  cortes: {
    listar: () => request('/api/v1/cortes/'),
    crear: (datos) =>
      request('/api/v1/cortes/', {
        method: 'POST',
        body: JSON.stringify(datos),
      }),
    editar: (id, datos) =>
      request(`/api/v1/cortes/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(datos),
      }),
    desactivar: (id) =>
      request(`/api/v1/cortes/${id}/`, { method: 'DELETE' }),
  },
  admin: {
    stats: () => request('/api/v1/admin/stats/'),
    carniceria: () => request('/api/v1/admin/carniceria/'),
  },
  compras: {
    listar: () => request('/api/v1/compras/'),
    crear: (datos) =>
      request('/api/v1/compras/', {
        method: 'POST',
        body: JSON.stringify(datos),
      }),
    detalle: (id) => request(`/api/v1/compras/${id}/`),
  },
}
