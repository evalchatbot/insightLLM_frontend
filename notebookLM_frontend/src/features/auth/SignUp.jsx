"use client"

// src/features/auth/SignUp.jsx
import { useState } from "react"
import { supabase } from "../../lib/supabase"
import { Link, useNavigate } from "react-router-dom"

export default function SignUp() {
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [pw, setPw] = useState("")
  const [phone, setPhone] = useState("") // optional
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const [hint, setHint] = useState("")
  const [resent, setResent] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setErr("")
    setHint("")
    setBusy(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pw,
        options: {
          data: {
            full_name: displayName,
            phone: phone || null,
          },
        },
      })

      if (error) {
        console.error("signUp error:", {
          message: error.message,
          status: error.status,
          name: error.name,
          code: error.code,
        })
        setErr(error.message || "Sign up failed")

        // Helpful hints for common cases
        if ((error.message || "").toLowerCase().includes("database error")) {
          setHint(
            'Likely a DB trigger/column mismatch in public.users. Check that public.users has a nullable "full_name" column and the signup trigger inserts into it.',
          )
        } else if ((error.message || "").toLowerCase().includes("rate limit")) {
          setHint("Email service may be rate-limited. Try again later or configure SMTP.")
        } else if ((error.message || "").toLowerCase().includes("invalid email")) {
          setHint("Make sure the email is valid and has no spaces.")
        }
        return
      }

      // If email confirmation is ON, you’ll need to confirm before login.
      navigate("/login")
    } catch (e) {
      console.error("signUp exception:", e)
      setErr("Network or unexpected error during sign up")
    } finally {
      setBusy(false)
    }
  }

  async function onResend() {
    try {
      setErr("")
      setHint("")
      const { error } = await supabase.auth.resend({ type: "signup", email })
      if (error) throw error
      setResent(true)
    } catch (e) {
      setErr(e.message || "Could not resend confirmation")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-light mb-2 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            insightlm
          </h1>
          <p className="text-gray-400 text-sm">Create your account to start exploring</p>
        </div>

        {/* Glass morphism container */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-medium text-white mb-6 text-center">Create Account</h2>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Display Name Input */}
            <div className="space-y-2">
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400/50 transition-all duration-300 backdrop-blur-sm"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400/50 transition-all duration-300 backdrop-blur-sm"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Phone Input */}
            <div className="space-y-2">
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400/50 transition-all duration-300 backdrop-blur-sm"
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <input
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400/50 transition-all duration-300 backdrop-blur-sm"
                placeholder="Password"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
              />
            </div>

            {/* Submit Button */}
            <button
              disabled={busy}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-teal-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-6"
            >
              {busy ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating Account...
                </div>
              ) : (
                "Create Account"
              )}
            </button>

            {/* Error and Hint Messages */}
            {err && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-4">
                <p className="text-red-400 text-sm">{err}</p>
              </div>
            )}

            {hint && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-2">
                <p className="text-amber-400 text-xs">{hint}</p>
              </div>
            )}

            
          </form>

          {/* Login Link */}
          <div className="text-center mt-6 pt-6 border-t border-white/10">
            <p className="text-gray-400 text-sm">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-teal-400 hover:text-teal-300 transition-colors duration-200 underline underline-offset-2"
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Security Note */}
          <div className="text-center mt-4">
            <p className="text-xs text-gray-500">By creating an account, you agree to our terms of service</p>
          </div>
        </div>
      </div>
    </div>
  )
}
