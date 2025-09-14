"use client"


import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ChevronDown } from "lucide-react"
import { useAuthStore } from "../../store/auth"
import { createSession, getGenres, createConversationEmpty } from "../../api/endpoints"
import { useChatStore } from "../../store/chat"

export default function Home() {
  const token = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const sessionId = useAuthStore((s) => s.sessionId)
  const setSessionId = useAuthStore((s) => s.setSessionId)
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState("")
  const [busySession, setBusySession] = useState(false)
  const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false)

  // Shared chat state for genre picker
  const selectedGenre = useChatStore((s) => s.selectedGenre)
  const setSelectedGenre = useChatStore((s) => s.setSelectedGenre)

  async function ensureSession() {
    if (sessionId) return sessionId
    if (busySession) return sessionId
    setBusySession(true)
    try {
      const res = await createSession()
      setSessionId(res.session_id)
      return res.session_id
    } finally {
      setBusySession(false)
    }
  }

  async function handleSearch(e) {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return

    if (!token) {
      navigate("/login")
      return
    }

    try {
      // create conversation on server first
      try {
        const convo = await createConversationEmpty()
        if (convo && convo.id) useAuthStore.getState().setConversationId(convo.id)
      } catch (e) {
        // ignore server failures; continue with local-only chat
      }

      // reset chat and set the seed in the shared store so ChatPage consumes it immediately
      const chatStore = require("../../store/chat").useChatStore.getState()
      if (chatStore?.startNewChat) chatStore.startNewChat()
      if (chatStore?.enterChat) chatStore.enterChat(q)
    } catch (e) {
      // fallback to localStorage if store call fails
      try {
        localStorage.setItem("chat.seedPrompt", q)
      } catch {}
    }
    setSearchQuery("")
    navigate("/chat")
  }

  const [genres, setGenres] = useState([
    "All Genres",
    "Fiction",
    "Non-Fiction",
    "Science",
    "History",
    "Biography",
    "Philosophy",
    "Technology",
    "Business",
    "Self-Help",
  ])

  useEffect(() => {
    async function fetch() {
      try {
        const fetched = await getGenres()
        if (fetched?.genres) setGenres(["All Genres", ...(fetched.genres || [])])
      } catch (e) {
        // ignore and keep static list
      }
    }
    fetch()
  }, [])

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col px-4 transition-all duration-300 ease-in-out ml-64 sidebar-collapsed:ml-16 md:ml-64 md:sidebar-collapsed:ml-16 ml-0 sm:ml-16">
      {/* Top-left genre picker */}
      <div className="relative w-full">
        <div className="absolute top-6 left-0 z-10">
          <div className="relative">
            <button
              onClick={() => setIsGenreDropdownOpen(!isGenreDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2  rounded-lg text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
            >
              <span>{selectedGenre}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isGenreDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isGenreDropdownOpen && (
              <div className="absolute top-full mt-2 w-48 bg-[#1a1a1a] rounded-lg shadow-lg overflow-hidden">
                {genres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => {
                      setSelectedGenre(genre)
                      setIsGenreDropdownOpen(false)
                    }}
                    className="w-full text-left px-4 py-2 text-gray-300 hover:text-white hover:bg-[#2a2a2a] transition-colors"
                  >
                    {genre}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero + search only */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center mb-12 pt-16">
          <h1 className="text-5xl md:text-6xl font-light tracking-wide mb-4">InsightLLM</h1>
          <p className="text-gray-400 text-lg">Chat with your books, discover insights</p>
        </div>

        <div className="w-full max-w-2xl mb-8">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative flex items-center">
              <div className="absolute left-4 text-gray-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask anything about your books..."
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl py-4 pl-12 pr-16 text-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors"
              />
              <div className="absolute right-4 flex items-center gap-2">
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                  title="Attach file"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                <button
                  type="submit"
                  disabled={!searchQuery.trim()}
                  className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                </button>
              </div>
            </div>
          </form>
        </div>

        {token && (
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Link
              to="/ingest"
              className="flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10,9 9,9 8,9" />
              </svg>
              Upload Books
            </Link>
            <Link
              to="/mcq"
              className="flex items-center gap-2 px-6 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" />
                <path d="M21 11h-4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" />
                <path d="M7 2v20" />
                <path d="M17 2v20" />
              </svg>
              Take Quiz
            </Link>
          </div>
        )}

        {!token && (
          <div className="text-center">
            <p className="text-gray-400 mb-4">Sign in to unlock the full experience</p>
            <div className="flex gap-3 justify-center">
              <Link
                to="/login"
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-6 py-2 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white rounded-lg transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
