import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { LoadingState } from '../components/feedback/LoadingState'
import { useAuth } from '../hooks/useAuth'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { TaskDetailPage } from '../pages/TaskDetailPage'
import { TaskManagementPage } from '../pages/TaskManagementPage'

function ProtectedRoute() {
  const { isLoading, user } = useAuth()

  if (isLoading) {
    return <LoadingState message="Memeriksa sesi..." />
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function GuestRoute() {
  const { isLoading, user } = useAuth()

  if (isLoading) {
    return <LoadingState message="Memeriksa sesi..." />
  }

  return user ? <Navigate to="/dashboard" replace /> : <Outlet />
}

function HomeRedirect() {
  const { isLoading, user } = useAuth()

  if (isLoading) {
    return <LoadingState message="Memeriksa sesi..." />
  }

  return <Navigate to={user ? '/dashboard' : '/login'} replace />
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<TaskManagementPage page="dashboard" />} />
          <Route path="/tasks" element={<TaskManagementPage page="tasks" />} />
          <Route path="/tasks/new" element={<TaskManagementPage page="tasks" />} />
          <Route path="/tasks/:taskId/edit" element={<TaskManagementPage page="tasks" />} />
          <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="/account" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
