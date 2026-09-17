import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route protection guard.
 * Redirects unauthenticated users to /login preserving the requested path.
 */
export default function AuthGuard({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#121214] text-[#A1A1AA]">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-[#E4E4E7] animate-ping" />
          <span>Restoring session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
