import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  teacherOnly?: boolean;
  bacTrackOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false, teacherOnly = false, bacTrackOnly = false }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  const roleOK = !adminOnly || user?.role === 'ADMIN';
  const teacherOK = !teacherOnly || user?.role === 'TEACHER' || user?.role === 'ADMIN';
  const statusOK = !user || user.role === 'ADMIN' || user.status === 'APPROVED';
  const bacOK = !bacTrackOnly || !user || user.educationTrack !== 'OTHER';

  const redirectTo = (() => {
    if (isLoading) return null;
    if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
    if (user.role !== 'ADMIN' && user.status !== 'APPROVED') return <Navigate to="/pending-approval" replace />;
    if (!roleOK) return <Navigate to={user?.role === 'TEACHER' ? '/teacher' : '/learning-path'} replace />;
    if (!teacherOK) return <Navigate to="/learning-path" replace />;
    if (!bacOK) return <Navigate to="/study-planner" replace />;
    if (!statusOK) return <Navigate to="/pending-approval" replace />;
    return null;
  })();

  return (
    <div className="contents">
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center">Loading...</div>
      ) : redirectTo ? (
        redirectTo
      ) : (
        <>{children}</>
      )}
    </div>
  );
};

export default ProtectedRoute;
