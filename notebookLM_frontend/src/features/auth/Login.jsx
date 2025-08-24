"use client"

import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuthStore } from "../../store/auth"
import { createSession } from "../../api/endpoints"
import { useNavigate, Link } from "react-router-dom"

export default function Login() {
  const [email, setEmail] = useState("")
  const [pw, setPw] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const setSessionId = useAuthStore((s) => s.setSessionId)
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setErr("")
    setBusy(true)
    console.log("email:", email, "pw length:", pw.length)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) throw error

      // create a server-side session for this user (no body)
      const res = await createSession()
      setSessionId(res.session_id)

      navigate("/chat")
    } catch (e) {
      setErr(e.message || "Login failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light tracking-wide mb-2 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            insightlm
          </h1>
          <p className="text-gray-400 text-sm">Welcome back to your knowledge companion</p>
        </div>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-medium text-white mb-6 text-center">Sign In</h2>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 block">Email</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400/50 transition-all duration-300 backdrop-blur-sm"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 block">Password</label>
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400/50 transition-all duration-300 backdrop-blur-sm"
                placeholder="Enter your password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                type="password"
                required
              />
            </div>

            <button
              disabled={busy}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-teal-500/25 disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {busy ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </button>

            {err && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400 text-center">{err}</p>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-teal-400 hover:text-teal-300 font-medium transition-colors duration-200 hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/forgot-password"
              className="text-gray-500 hover:text-gray-400 text-xs transition-colors duration-200 hover:underline"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600 text-xs">Secure authentication powered by Supabase</p>
        </div>
      </div>
    </div>
  )
}
