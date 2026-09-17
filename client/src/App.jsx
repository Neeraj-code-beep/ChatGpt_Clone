import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Mainroutes from './routes/Mainroutes';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <div className="min-h-screen bg-[#121214] text-[#E4E4E7] font-sans antialiased">
          <Mainroutes />
        </div>
      </AuthProvider>
    </ToastProvider>
  );
}
