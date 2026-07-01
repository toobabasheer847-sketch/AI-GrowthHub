import { Navigate, useLocation } from "react-router-dom";

import useAuth from "@/hooks/useAuth";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-soft">
        Loading session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default ProtectedRoute;
