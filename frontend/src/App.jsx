import { Navigate, Route, Routes } from 'react-router-dom';
import SharedLayout from './components/SharedLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateItem from './pages/CreateItem';
import PostItem from './pages/PostItem';
import LostItems from './pages/LostItems';
import FoundItems from './pages/FoundItems';
import Marketplace from './pages/Marketplace';
import Account from './pages/Account';

const LandingRedirect = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-card auth-status">
        <p>Loading application...</p>
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<SharedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/lost-items" element={<LostItems />} />
          <Route path="/found-items" element={<FoundItems />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/post-item" element={<PostItem />} />
          <Route path="/account" element={<Account />} />
          <Route path="/create-item" element={<CreateItem />} />
        </Route>
      </Route>

      <Route path="*" element={<LandingRedirect />} />
    </Routes>
  );
};

export default App;
