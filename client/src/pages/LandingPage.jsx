import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Database,
  ShieldCheck,
  Cpu,
  Layers,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import Navbar from '../components/Navbar';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#121214] text-[#E4E4E7] flex flex-col selection:bg-[#3F3F46] selection:text-[#FAFAFA]">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative px-4 sm:px-6 pt-16 sm:pt-24 pb-16 max-w-5xl mx-auto text-center">
          {/* Subtle announcement pill */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#27272A] bg-[#18181B] text-xs text-[#A1A1AA] mb-6 shadow-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span className="font-mono text-[11px]">Nexa 1.0</span>
            <span className="text-[#3F3F46]">•</span>
            <span>Real-time Conversational Memory</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#FAFAFA] max-w-4xl mx-auto leading-[1.12]"
          >
            A conversational AI workspace with long-term memory.
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="text-sm sm:text-base md:text-lg text-[#A1A1AA] mt-6 max-w-2xl mx-auto leading-relaxed"
          >
            Nexa pairs low-latency reasoning with vector-indexed conversational memory.
            Your context, decisions, and preferences persist seamlessly across sessions.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8"
          >
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FAFAFA] text-[#121214] font-medium text-sm hover:bg-[#E4E4E7] transition-all shadow-md cursor-pointer"
            >
              <span>Get started for free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-[#27272A] bg-[#18181B] text-[#E4E4E7] hover:bg-[#27272A] hover:text-[#FAFAFA] font-medium text-sm transition-all cursor-pointer"
            >
              Log in to workspace
            </Link>
          </motion.div>

          {/* Interactive UI Mockup Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="mt-14 sm:mt-18 rounded-2xl border border-[#27272A] bg-[#18181B]/80 shadow-2xl p-3 sm:p-4 text-left max-w-3xl mx-auto backdrop-blur-md"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A] text-xs text-[#71717A]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#27272A]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27272A]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27272A]" />
                <span className="ml-2 font-mono text-[11px] text-[#A1A1AA]">
                  workspace / active-session
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="font-mono text-[10px]">Socket Connected</span>
              </div>
            </div>

            <div className="py-4 space-y-4 text-xs sm:text-sm">
              <div className="flex items-start gap-3 justify-end">
                <div className="bg-[#27272A] text-[#FAFAFA] p-3 rounded-xl rounded-tr-sm max-w-[85%] border border-[#3F3F46]/50">
                  Can you recall which stack we selected for our real-time messaging pipeline?
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#27272A] border border-[#3F3F46] flex items-center justify-center text-[#FAFAFA] shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="bg-[#141417] text-[#D4D4D8] p-3.5 rounded-xl rounded-tl-sm max-w-[85%] border border-[#27272A] leading-relaxed">
                  <div className="text-[11px] font-mono text-[#10B981] mb-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Memory Retrievied (Pinecone 768-dim score: 0.92)</span>
                  </div>
                  Haan ji! In our earlier conversation, you decided on <strong>Node.js</strong> with <strong>Socket.IO</strong>, <strong>MongoDB</strong> for message turns, and <strong>Pinecone</strong> for 768-dimensional vector memory retrieval.
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* CORE CAPABILITIES SECTION */}
        <section id="features" className="py-16 sm:py-24 border-t border-[#27272A]/70 bg-[#0E0E10]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-xl mx-auto mb-14">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#FAFAFA]">
                Engineered for serious interaction.
              </h2>
              <p className="text-xs sm:text-sm text-[#A1A1AA] mt-2.5 leading-relaxed">
                Not a generic wrapper. Nexa is built from the ground up with idempotent request
                guarantees, hybrid context retrieval, and low-latency response delivery.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                {
                  icon: Database,
                  title: 'Semantic Vector Memory',
                  desc: 'Transforms interactions into 768-dimensional embeddings indexed in Pinecone for context continuity across conversations.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Two-Layer Idempotency',
                  desc: 'Client-supplied request identifiers protect against double submissions, network retries, and socket disconnects.',
                },
                {
                  icon: Cpu,
                  title: 'Google Gemini 3.6 Flash',
                  desc: 'Powered by Gemini models with bounded timeouts and parallelized retrieval pipelines for responsive answers.',
                },
                {
                  icon: Layers,
                  title: 'Dual-Store Architecture',
                  desc: 'MongoDB stores complete conversation turns while Pinecone maintains long-term semantic knowledge extraction.',
                },
                {
                  icon: Terminal,
                  title: 'Cookie-Based Security',
                  desc: 'Zero localStorage token storage. Full session authorization via HTTP-only JWT cookies on REST and WebSockets.',
                },
                {
                  icon: Sparkles,
                  title: 'Editorial Personality',
                  desc: 'Thoughtful, supportive, and technically rigorous assistant persona tailored for productivity and learning.',
                },
              ].map((feat, idx) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-[#27272A] bg-[#141417]/80 hover:bg-[#18181B] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-8 h-8 rounded-xl bg-[#1F1F23] border border-[#27272A] flex items-center justify-center text-[#FAFAFA] mb-4">
                        <Icon className="w-4 h-4 text-[#D4D4D8]" />
                      </div>
                      <h3 className="text-sm font-semibold text-[#FAFAFA] tracking-tight">
                        {feat.title}
                      </h3>
                      <p className="text-xs text-[#A1A1AA] mt-1.5 leading-relaxed">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* MINIMAL CTA SECTION */}
        <section className="py-16 sm:py-20 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="p-8 sm:p-12 rounded-3xl border border-[#27272A] bg-gradient-to-b from-[#18181B] to-[#121214] shadow-xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#FAFAFA]">
              Ready to experience context-aware conversation?
            </h2>
            <p className="text-xs sm:text-sm text-[#A1A1AA] mt-2 max-w-md mx-auto leading-relaxed">
              Create an account in seconds and start chatting with Nexa.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FAFAFA] text-[#121214] font-medium text-xs sm:text-sm hover:bg-[#E4E4E7] transition-all shadow-md cursor-pointer"
              >
                <span>Launch Nexa Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#27272A]/70 py-6 text-center text-xs text-[#71717A] bg-[#0E0E10]">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#FAFAFA]">Nexa</span>
            <span>• Full-Stack AI Chatbot Workspace</span>
          </div>
          <div className="text-[11px] font-mono">
            Node.js • Express • Socket.IO • Gemini • Pinecone
          </div>
        </div>
      </footer>
    </div>
  );
}
