"use client"

import { Link, NavLink, useNavigate } from "react-router-dom"
import { useAuthStore } from "../store/auth"

function navClass({ isActive }) {
  return `text-sm transition-all duration-300 hover:text-teal-400 hover:scale-105 ${
    isActive ? "font-semibold text-teal-400 border-b border-teal-400" : "text-gray-300"
  }`
}

function initialsFrom(user) {
  const full = user?.user_metadata?.full_name || user?.email || ""
  const parts = full.replace(/@.*/, "").split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] || ""
  const second = parts[1]?.[0] || ""
  return (first + second || first || "U").toUpperCase()
}

export default function Navbar() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  async function onLogout() {
    await logout()
    navigate("/")
  }

  return (
    <nav className="backdrop-blur-xl bg-black/80 border-b border-gray-800/50 sticky top-0 z-50 shadow-lg shadow-black/20">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-6">
        <Link
          to="/"
          className="font-bold text-xl bg-gradient-to-r from-white to-teal-400 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300"
        >
          InsightLLM
        </Link>

        <div className="flex items-center gap-6">
          <NavLink to="/chat" className={navClass} >
            Chat
          </NavLink>
          <NavLink to="/ingest" className={navClass}>
            Ingest
          </NavLink>
          <NavLink to="/mcq" className={navClass}>
            MCQ
          </NavLink>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {!token ? (
            <>
              <Link
                to="/login"
                className="text-sm px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800/50 hover:border-teal-400 hover:text-teal-400 transition-all duration-300 backdrop-blur-sm"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-400 hover:to-teal-500 hover:scale-105 transition-all duration-300 shadow-lg shadow-teal-500/25"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-500 to-teal-600 flex items-center justify-center text-xs font-semibold text-white shadow-lg">
                  {initialsFrom(user)}
                </div>
              </div>
              <button
                onClick={onLogout}
                className="text-sm px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800/50 hover:border-red-400 hover:text-red-400 transition-all duration-300 backdrop-blur-sm"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
