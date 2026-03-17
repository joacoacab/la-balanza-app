import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NuevaCompra from './pages/NuevaCompra'
import Cortes from './pages/Cortes'
import Registro from './pages/Registro'
import Historial from './pages/Historial'
import HistorialDetalle from './pages/HistorialDetalle'
import Precios from './pages/Precios'
import Bienvenida from './pages/Bienvenida'
import AdminPanel from './pages/AdminPanel'
import AdminClienteDetalle from './pages/AdminClienteDetalle'
import Planes from './pages/Planes'
import SuscripcionConfirmacion from './pages/SuscripcionConfirmacion'
import AppLayout from './layouts/AppLayout'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/" replace />
}

function StaffRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  if (!user.is_staff) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route
          path="/admin-saas/"
          element={
            <StaffRoute>
              <AdminPanel />
            </StaffRoute>
          }
        />
        <Route
          path="/admin-saas/clientes/:id"
          element={
            <StaffRoute>
              <AdminClienteDetalle />
            </StaffRoute>
          }
        />
        <Route
          path="/bienvenida"
          element={
            <PrivateRoute>
              <Bienvenida />
            </PrivateRoute>
          }
        />
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/nueva-compra" element={<NuevaCompra />} />
          <Route path="/cortes" element={<Cortes />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/historial/:id" element={<HistorialDetalle />} />
          <Route path="/precios" element={<Precios />} />
          <Route path="/planes" element={<Planes />} />
        </Route>
        <Route
          path="/planes/confirmacion"
          element={
            <PrivateRoute>
              <SuscripcionConfirmacion />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
