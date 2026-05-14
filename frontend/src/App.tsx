import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PortalAuth from './pages/PortalAuth';
import Home from './pages/Home';
import UserDashboard from './pages/UserDashboard';
import UserRatings from './pages/UserRatings';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/AdminOrders';
import AdminSales from './pages/AdminSales';
import AdminAuction from './pages/AdminAuction';
import MarketChart from './pages/MarketChart';
import AppLayout from './components/AppLayout';
import { useAuthStore } from './store/useAuthStore';

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { user, session, loading } = useAuthStore();

  if (loading) return <div>Memuat...</div>;
  if (!session) {
    return <Navigate to="/auth" />;
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  return children;
};

// Home Redirect Logic
const HomeRedirect = () => {
  const { user } = useAuthStore();
  if (user?.role === 'admin') return <Navigate to="/admin/sales" replace />;
  return <Home />;
};

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/auth" element={<PortalAuth />} />
          <Route path="/" element={
            <ProtectedRoute>
              <HomeRedirect />
            </ProtectedRoute>
          } />

          <Route path="/user/dashboard" element={
            <ProtectedRoute>
              <UserDashboard />
            </ProtectedRoute>
          } />

          <Route path="/user/ratings" element={
            <ProtectedRoute>
              <UserRatings />
            </ProtectedRoute>
          } />



          <Route path="/admin/dashboard" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin/orders" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminOrders />
            </ProtectedRoute>
          } />

          <Route path="/admin/sales" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminSales />
            </ProtectedRoute>
          } />

          <Route path="/admin/auction" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminAuction />
            </ProtectedRoute>
          } />

          <Route path="/user/market" element={
            <ProtectedRoute>
              <MarketChart />
            </ProtectedRoute>
          } />

        </Routes>
      </AppLayout>
    </Router>
  );
}

export default App;
