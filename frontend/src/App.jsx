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
import AppLayout from './layouts/AppLayout'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
