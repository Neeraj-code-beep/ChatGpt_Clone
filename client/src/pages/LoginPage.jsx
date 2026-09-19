import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Sparkles, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const { login, isLoading } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/chat';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }

    if (!password) {
      setFormError('Please enter your password.');
      return;
    }

    const result = await login({ email, password });

    if (result.success) {
      addToast({
        type: 'success',
        title: 'Welcome back',
        message: 'Successfully authenticated. Entering workspace.',
      });
      navigate(from, { replace: true });
    } else {
      setFormError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#121214] text-[#E4E4E7] flex flex-col selection:bg-[#3F3F46] selection:text-[#FAFAFA]">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-[#27272A] bg-[#141417] shadow-2xl"
        >
          {/* Brand Header */}
          <div className="text-center mb-6">
            <div className="w-9 h-9 rounded-xl bg-[#27272A] border border-[#3F3F46] flex items-center justify-center text-xs text-[#FAFAFA] mx-auto mb-3">
              <Sparkles className="w-4 h-4 text-[#D4D4D8]" />
            </div>
            <h1 className="text-xl font-semibold text-[#FAFAFA] tracking-tight">
              Log in to Nexa
            </h1>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Enter your credentials to access your conversational workspace.
            </p>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 mb-4 rounded-xl border border-[#78350F]/60 bg-[#1C1917] text-[#FED7AA] text-xs leading-relaxed"
            >
              {formError}
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-[#D4D4D8] mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#27272A] bg-[#18181B] text-sm text-[#FAFAFA] placeholder:text-[#71717A] focus:border-[#52525B] focus:ring-1 focus:ring-[#52525B] transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[#D4D4D8] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#27272A] bg-[#18181B] text-sm text-[#FAFAFA] placeholder:text-[#71717A] focus:border-[#52525B] focus:ring-1 focus:ring-[#52525B] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAFAFA] text-[#121214] font-medium text-xs sm:text-sm hover:bg-[#E4E4E7] transition-all shadow-sm disabled:opacity-60 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#121214]" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="text-center mt-6 pt-4 border-t border-[#27272A] text-xs text-[#A1A1AA]">
            <span>Don't have an account? </span>
            <Link
              to="/register"
              className="font-medium text-[#FAFAFA] hover:underline transition-all"
            >
              Create one
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
