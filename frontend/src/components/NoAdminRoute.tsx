import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface NoAdminRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

const NoAdminRoute: React.FC<NoAdminRouteProps> = ({ children, redirectTo = '/admin' }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (user?.role === 'ADMIN') {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default NoAdminRoute;
