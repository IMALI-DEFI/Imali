
// src/admin/_GamifiedShell.jsx
import React from "react";

/**
 * GamifiedShell
 * Wrap any admin module content with a consistent, gamified look that matches Home.jsx.
 *
 * Props:
 * - title: string
 * - subtitle?: string
 * - actions?: ReactNode (buttons, etc.)
 * - children: main content
 */
export default function GamifiedShell({ title, subtitle, actions, children }) {
  return (
    <div className="relative">
      {/* Deep gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-gray-900 via-gray-950 to-black" />
      {/* Ambient orbs */}
      <div
        className="pointer-events-none absolute -top-20 -left-24 h-64 w-64 rounded-full blur-3xl opacity-25 -z-10"
        style={{ background: "radial-gradient(60% 60% at 50% 50%, #22d3ee55 0%, transparent 60%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-16 right-10 h-72 w-72 rounded-full blur-3xl opacity-20 -z-10"
        style={{ background: "radial-gradient(60% 60% at 50% 50%, #a78bfa55 0%, transparent 60%)" }}
      />
      <div
        className="pointer-events-none absolute bottom-10 left-1/3 h-72 w-72 rounded-full blur-3xl opacity-15 -z-10"
        style={{ background: "radial-gradient(60% 60% at 50% 50%, #f472b655 0%, transparent 60%)" }}
      />

      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-300 via-yellow-300 to-pink-300 bg-clip-text text-transparent">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
      </div>

      {actions && (
        <div className="mb-4 flex flex-wrap gap-2">
          {actions}
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5 shadow-xl">
        {children}
      </div>
    </div>
  );
}
