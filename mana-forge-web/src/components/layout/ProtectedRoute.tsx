import { Navigate, Outlet } from 'react-router-dom';
import { useUser } from '../../services/UserContext';
import ForgeSpinner from '../ui/ForgeSpinner';

const ProtectedRoute = () => {
  const { isAuthenticated, isSessionLoading } = useUser();

  if (isSessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <ForgeSpinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
