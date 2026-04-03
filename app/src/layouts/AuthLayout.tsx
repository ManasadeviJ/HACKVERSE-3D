import { Outlet, Link, Navigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect already-logged-in users away from auth pages
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-cyber-dark flex flex-col">
      {/* Top bar */}
      <header className="py-6 px-8">
        <Link to="/" className="flex items-center space-x-2 w-fit">
          <div className="w-8 h-8 bg-cyber-cyan rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-cyber-dark" />
          </div>
          <span className="text-white font-heading font-bold text-xl">Hackverse</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-8 text-center text-cyber-gray text-sm">
        <p>© {new Date().getFullYear()} Hackverse. All rights reserved.</p>
      </footer>
    </div>
  );
}
