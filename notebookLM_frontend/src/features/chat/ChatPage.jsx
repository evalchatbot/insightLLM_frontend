"use client"

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown } from "lucide-react"
import { useAuthStore } from "../../store/auth"
import { createSession } from "../../api/endpoints"

export default function Home() {
  const token = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const sessionId = useAuthStore((s) => s.sessionId)
  const setSessionId = useAuthStore((s) => s.setSessionId)

  const [searchQuery, setSearchQuery] = useState("")
  const [busySession, setBusySession] = useState(false)
  const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState("All Genres")

  const [messages, setMessages] = useState([])
  const [isInChatMode, setIsInChatMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (token && !sessionId && searchQuery.trim()) {
      handleNewSession()
    }
  }, [searchQuery, token, sessionId])

  async function handleNewSession() {
    if (busySession) return
    setBusySession(true)
    try {
      const res = await createSession()
      setSessionId(res.session_id)
    } catch (e) {
      console.error("Failed to create session:", e)
    } finally {
      setBusySession(false)
    }
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!searchQuery.trim()) return

    if (!token) {
      // Navigate to login if not authenticated
      window.location.href = "/login"
      return
    }

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      role: "user",
      content: searchQuery.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsInChatMode(true)
    setIsLoading(true)

    const currentQuery = searchQuery
    setSearchQuery("")

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: `I understand you're asking about "${currentQuery}". This is where I would provide insights based on your uploaded books and the selected genre: ${selectedGenre}.`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
      setIsLoading(false)
    }, 1500)
  }

  const categories = [
    { label: "Summarize", icon: "📄" },
    { label: "Analyze", icon: "🔍" },
    { label: "Quiz Me", icon: "❓" },
    { label: "Explain", icon: "💡" },
    { label: "Compare", icon: "⚖️" },
  ]

  const genres = [
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
  ]

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col px-4 transition-all duration-300 ease-in-out ml-64 sidebar-collapsed:ml-16">
      {!isInChatMode && (
        <div className="relative w-full">
          <div className="absolute top-6 left-0 z-10">
            <div className="relative">
              <button
                onClick={() => setIsGenreDropdownOpen(!isGenreDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
              >
                <span>{selectedGenre}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isGenreDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isGenreDropdownOpen && (
                <div className="absolute top-full mt-2 w-48 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-lg overflow-hidden">
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
      )}

      {isInChatMode && (
        <div className="flex-1 overflow-y-auto py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message) => (
              <div key={message.id} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-medium">
                  {message.role === "user" ? "U" : "AI"}
                </div>
                <div className="flex-1">
                  <div className="text-gray-300 leading-relaxed">{message.content}</div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-medium">
                  AI
                </div>
                <div className="flex-1">
                  <div className="text-gray-400">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className={`flex flex-col items-center transition-all duration-500 ${isInChatMode ? "pb-6" : "flex-1 justify-center"}`}
      >
        {!isInChatMode && (
          <div className="text-center mb-12 pt-16">
            <h1 className="text-5xl md:text-6xl font-light tracking-wide mb-4">insightlm</h1>
            <p className="text-gray-400 text-lg">Chat with your books, discover insights</p>
          </div>
        )}

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
                placeholder={isInChatMode ? "Ask a follow-up question..." : "Ask anything about your books..."}
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
                  disabled={!searchQuery.trim() || isLoading}
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

        {!isInChatMode && (
          <>
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {categories.map((category) => (
                <button
                  key={category.label}
                  onClick={() => {
                    setSearchQuery(`${category.label} my uploaded content`)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-full text-gray-300 hover:text-white hover:border-gray-500 transition-colors text-sm"
                >
                  <span>{category.icon}</span>
                  {category.label}
                </button>
              ))}
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
          </>
        )}
      </div>
    </div>
  )
}
