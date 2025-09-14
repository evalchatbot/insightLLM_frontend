"use client"

import { useEffect, useState, useRef } from "react"
import { ChevronDown } from "lucide-react"
import { useAuthStore } from "../../store/auth"
import { useChatStore } from "../../store/chat"
import { createSession, askChat, getGenres } from "../../api/endpoints"

export default function ChatPage() {
  const token = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const sessionId = useAuthStore((s) => s.sessionId)
  const setSessionId = useAuthStore((s) => s.setSessionId)

  // Shared chat store
  const messages = useChatStore((s) => s.messages)
  const appendMessage = useChatStore((s) => s.appendMessage)
  const seedPrompt = useChatStore((s) => s.seedPrompt)
  const clearSeedPrompt = useChatStore((s) => s.clearSeedPrompt)

  const isLoading = useChatStore((s) => s.isLoading)
  const setIsLoading = useChatStore((s) => s.setIsLoading)

  const selectedGenre = useChatStore((s) => s.selectedGenre)
  const setSelectedGenre = useChatStore((s) => s.setSelectedGenre)

  const [genres, setGenres] = useState(["All Genres"])
  const [searchQuery, setSearchQuery] = useState("")
  const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false)
  const [busySession, setBusySession] = useState(false)

  const inputRef = useRef(null)

  useEffect(() => {
    async function fetchGenres() {
      try {
        const fetched = await getGenres()
        setGenres(["All Genres", ...(fetched?.genres || [])])
      } catch (e) {
        // fail silently
      }
    }
    fetchGenres()
  }, [])

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

  // 🔰 Consume the seed prompt handed from Home exactly once
  useEffect(() => {
    const runSeed = async (prompt) => {
      if (!prompt || !token) return
      const sid = await ensureSession()
      const userId = useAuthStore.getState().user?.id

      // add user message
      const userMessage = {
        id: Date.now(),
        role: "user",
        content: prompt,
        timestamp: new Date(),
      }
      appendMessage(userMessage)
      setIsLoading(true)

      try {
        const res = await askChat({
          user_id: userId,
          session_id: sid,
          question: prompt,
          genre: selectedGenre,
        })
        appendMessage({
          id: Date.now() + 1,
          role: "assistant",
          content: res.answer || "[Empty answer]",
          timestamp: new Date(),
        })
      } catch (e) {
        appendMessage({
          id: Date.now() + 1,
          role: "assistant",
          content: "[Error] Chat failed",
          timestamp: new Date(),
        })
      } finally {
        setIsLoading(false)
        // focus the input for follow-up
        if (inputRef.current) inputRef.current.focus()
      }
    }

    // Priority: prefer in-memory store seed, otherwise look for localStorage seed set by Home
    const lsSeed = (() => {
      try {
        return localStorage.getItem("chat.seedPrompt")
      } catch (e) {
        return null
      }
    })()

    if (seedPrompt) {
      runSeed(seedPrompt)
      clearSeedPrompt()
    } else if (lsSeed) {
      // consume localStorage seed once
      runSeed(lsSeed)
      try {
        localStorage.removeItem("chat.seedPrompt")
      } catch (e) { }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedPrompt, token, selectedGenre])

  async function handleSearch(e) {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q || isLoading) return

    if (!token) {
      window.location.href = "/login"
      return
    }

    const sid = await ensureSession()
    const userId = useAuthStore.getState().user?.id

    // append user message
    appendMessage({
      id: Date.now(),
      role: "user",
      content: q,
      timestamp: new Date(),
    })
    setSearchQuery("")
    setIsLoading(true)

    try {
      const res = await askChat({
        user_id: userId,
        session_id: sid,
        question: q,
        genre: selectedGenre,
      })
      appendMessage({
        id: Date.now() + 1,
        role: "assistant",
        content: res.answer || "[Empty answer]",
        timestamp: new Date(),
      })
    } catch (e) {
      appendMessage({
        id: Date.now() + 1,
        role: "assistant",
        content: "[Error] Chat failed",
        timestamp: new Date(),
      })
    } finally {
      setIsLoading(false)
      if (inputRef.current) inputRef.current.focus()
    }
  }

  const categories = [
    { label: "Summarize", icon: "📄" },
    { label: "Analyze", icon: "🔍" },
    { label: "Quiz Me", icon: "❓" },
    { label: "Explain", icon: "💡" },
    { label: "Compare", icon: "⚖️" },
  ]

  return (
  <div className="min-h-[calc(100vh-0px)] bg-[#0f0f0f] text-white flex flex-col px-0 transition-all duration-300 ease-in-out ml-64 sidebar-collapsed:ml-16 md:ml-64 md:sidebar-collapsed:ml-16 ml-0 sm:ml-16">
      {/* Top-left genre picker (fixed so it doesn't scroll, aligned with sidebar) */}
      <div className="fixed top-6 left-0 z-30 ml-64 sidebar-collapsed:ml-16 md:ml-64 md:sidebar-collapsed:ml-16 ml-0 sm:ml-16">
        <div className="relative">
          <button
            onClick={() => setIsGenreDropdownOpen(!isGenreDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
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

  {/* Chat transcript (add top padding so top-left picker doesn't overlap messages) */}
  <div className="flex-1 overflow-y-auto pt-20 pb-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {messages.map((message) => (
            <div key={message.id} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm font-medium">
                {message.role === "user" ? "U" : "AI"}
              </div>
              <div className="flex-1">
                <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">{message.content}</div>
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

      {/* Composer - fixed at bottom */}
      <div className="fixed left-0 right-0 bottom-0 pb-4 bg-transparent z-20 ml-64 sidebar-collapsed:ml-16 md:ml-64 md:sidebar-collapsed:ml-16 ml-0 sm:ml-16">
        <div className="max-w-5xl mx-auto w-full px-4">
          {/* composer no longer contains the genre picker (moved to top-left) */}

          {/* Input */}
          <form onSubmit={handleSearch} className="relative">
            <div className="relative flex items-center">
              <div className="absolute left-4 text-gray-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask a follow-up question..."
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl py-4 pl-12 pr-16 text-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors" />
              <div className="absolute right-4 flex items-center gap-2">
                <button type="button" className="text-gray-400 hover:text-gray-300 transition-colors" title="Attach file">
                  📎
                </button>
                <button
                  type="submit"
                  disabled={!searchQuery.trim() || isLoading}
                  className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors"
                >
                  ➤
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      {/* Spacer to prevent transcript overlap with fixed input */}
      <div className="h-[120px]" />
    </div>
  )
}
