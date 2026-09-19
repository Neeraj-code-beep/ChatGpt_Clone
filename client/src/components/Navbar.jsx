import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function Navbar() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#27272A]/70 bg-[#121214]/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-[#FAFAFA] font-medium tracking-tight hover:opacity-90 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-[#27272A] border border-[#3F3F46] flex items-center justify-center text-xs text-[#FAFAFA]">
            <Sparkles className="w-3.5 h-3.5 text-[#D4D4D8]" />
          </div>
          <span className="text-base tracking-tight font-semibold">Nexa</span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border border-[#3F3F46]/80 text-[#A1A1AA] bg-[#18181B]">
            Workspace
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-3 sm:gap-4 text-sm">
          {!isAuthPage && (
            <Link
              to="/#features"
              className="text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors hidden sm:inline-block text-xs font-medium"
            >
              Capabilities
            </Link>
          )}

          {isAuthenticated ? (
            <Link
              to="/chat"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FAFAFA] text-[#121214] font-medium text-xs hover:bg-[#E4E4E7] transition-all"
            >
              <span>Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              {location.pathname !== '/login' && (
                <Link
                  to="/login"
                  className="text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors px-2 py-1"
                >
                  Log in
                </Link>
              )}
              {location.pathname !== '/register' && (
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FAFAFA] text-[#121214] font-medium text-xs hover:bg-[#E4E4E7] transition-all"
                >
                  <span>Sign up</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
