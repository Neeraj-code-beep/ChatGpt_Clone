import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
      <div className="text-center p-8 bg-slate-800 rounded-xl shadow-xl max-w-md w-full border border-slate-700">
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          ChatGPT Clone
        </h1>
        <p className="text-slate-400 mb-6">
          Real-time AI Chatbot powered by Express, Socket.IO, Gemini 3.6 Flash & Pinecone Vector DB.
        </p>
        <div className="inline-block px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full text-sm font-medium border border-emerald-500/20">
          Client Online
        </div>
      </div>
    </div>
  );
}
