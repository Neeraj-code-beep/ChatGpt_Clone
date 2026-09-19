import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Sparkles, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const { register, isLoading } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!firstName.trim()) {
      setFormError('First name is required.');
      return;
    }

    if (!lastName.trim()) {
      setFormError('Last name is required.');
      return;
    }

    if (!email.trim()) {
      setFormError('Email address is required.');
      return;
    }

    if (!password || password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    const result = await register({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
    });

    if (result.success) {
      addToast({
        type: 'success',
        title: 'Account created',
        message: 'Welcome to Nexa. Your workspace is ready.',
      });
      navigate('/chat', { replace: true });
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
              Create your Nexa account
            </h1>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Start conversations with long-term memory retrieval.
            </p>
          </div>

          {/* Error Banner */}
          {formError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 mb-4 rounded-xl border border-[#78350F]/60 bg-[#1C1917] text-[#FED7AA] text-xs leading-relaxed"
            >
              {formError}
            </motion.div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-xs font-medium text-[#D4D4D8] mb-1.5"
                >
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#27272A] bg-[#18181B] text-sm text-[#FAFAFA] placeholder:text-[#71717A] focus:border-[#52525B] focus:ring-1 focus:ring-[#52525B] transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-xs font-medium text-[#D4D4D8] mb-1.5"
                >
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full px-3 py-2.5 rounded-xl border border-[#27272A] bg-[#18181B] text-sm text-[#FAFAFA] placeholder:text-[#71717A] focus:border-[#52525B] focus:ring-1 focus:ring-[#52525B] transition-all"
                />
              </div>
            </div>

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
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
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
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="text-center mt-6 pt-4 border-t border-[#27272A] text-xs text-[#A1A1AA]">
            <span>Already have an account? </span>
            <Link
              to="/login"
              className="font-medium text-[#FAFAFA] hover:underline transition-all"
            >
              Log in
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
