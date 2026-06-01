import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Spinner from './components/Spinner';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import Profile from './pages/Profile';
import MyListings from './pages/MyListings';
import Watchlist from './pages/Watchlist';
import AdminDashboard from './pages/AdminDashboard';
import Notifications from './pages/Notifications';

/* Redirect admin users away from user-only routes → /admin */
const UserOnlyRoute = () => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}><Spinner large /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.is_admin) return <Navigate to="/admin" replace />;
  return <Outlet />;
};

/* Redirect admin to /admin, guests to /login; pass regular users through */
const HomeRoute = () => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  if (user?.is_admin) return <Navigate to="/admin" replace />;
  return <Home />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              <Navbar />
              <main style={{ flex: 1 }}>
                <Routes>
                  {/* Public */}
                  <Route path="/"               element={<HomeRoute />} />
                  <Route path="/login"           element={<Login />} />
                  <Route path="/register"        element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/listings/:id"    element={<ListingDetail />} />

                  {/* User-only (admin blocked → redirected to /admin) */}
                  <Route element={<UserOnlyRoute />}>
                    <Route path="/create"        element={<CreateListing />} />
                    <Route path="/profile"       element={<Profile />} />
                    <Route path="/my-listings"   element={<MyListings />} />
                    <Route path="/watchlist"     element={<Watchlist />} />
                    <Route path="/notifications" element={<Notifications />} />
                  </Route>

                  {/* Admin-only */}
                  <Route element={<ProtectedRoute adminOnly />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                  </Route>
                </Routes>
              </main>
            </div>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
