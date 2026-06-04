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

  const response = await fetch(path, { ...options, headers })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const err = new Error('API error')
    err.status = response.status
    err.data = data
    throw err
  }

  if (response.status === 204) return null
  return response.json()
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
    cargarPlantilla: (tipo_animal) =>
      request('/api/v1/cortes/cargar-plantilla/', {
        method: 'POST',
        body: JSON.stringify({ tipo_animal }),
      }),
  },
  admin: {
    stats: () => request('/api/v1/admin/stats/'),
    carniceria: () => request('/api/v1/admin/carniceria/'),
    clienteDetalle: (id) => request(`/api/v1/admin/carniceria/${id}/`),
    clienteSuscripcion: (id, body) =>
      request(`/api/v1/admin/carniceria/${id}/suscripcion/`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    preciosGet: () => request('/api/v1/admin/precios/'),
    preciosPut: (precios) =>
      request('/api/v1/admin/precios/', {
        method: 'PUT',
        body: JSON.stringify(precios),
      }),
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
  compraCortes: {
    editar: (compraId, corteId, datos) =>
      request(`/api/v1/compras/${compraId}/cortes/${corteId}/`, {
        method: 'PATCH',
        body: JSON.stringify(datos),
      }),
  },
  billing: {
    suscribir: (ciclo) =>
      request('/api/v1/billing/suscribir/', {
        method: 'POST',
        body: JSON.stringify({ ciclo }),
      }),
    estado: () => request('/api/v1/billing/estado/'),
    precios: () => request('/api/v1/billing/precios/'),
  },
}
