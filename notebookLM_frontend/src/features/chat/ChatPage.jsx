"use client"

import { useEffect, useState, useRef } from "react"
import { ChevronDown } from "lucide-react"
import { useAuthStore } from "../../store/auth"
import { useChatStore } from "../../store/chat"
import { createSession, askChat, getGenres, addConversationMessage, getConversation, getConversationMessages, createConversationAutoTitle, setStoredConversationId } from "../../api/endpoints"

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
  const transcriptRef = useRef(null)
  const prevMessagesLengthRef = useRef(0)
  const [conversationId, setConversationId] = useState(useAuthStore.getState().conversationId || null)
  const authConversationId = useAuthStore((s) => s.conversationId)
  const setAuthConversationId = useAuthStore((s) => s.setConversationId)
  const [messagesPage, setMessagesPage] = useState({ offset: 0, limit: 20 })
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMoreOlder, setHasMoreOlder] = useState(true)

  useEffect(() => {
    // If there were already messages and now more arrived, scroll to bottom
    const prevLen = prevMessagesLengthRef.current
    const curLen = messages?.length || 0
    if (transcriptRef.current && curLen > prevLen && prevLen > 0) {
      // scroll to bottom
      try {
        transcriptRef.current.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' })
      } catch (e) {
        transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
      }
    }
    prevMessagesLengthRef.current = curLen
  }, [messages])

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

  // Hydrate conversation when the active conversation id changes
  useEffect(() => {
    let mounted = true
    async function hydratePaged() {
      const stored = authConversationId || useAuthStore.getState().conversationId
      // if no conversation selected, just clear local state
      if (!stored) {
        try {
          const chatStore = require("../../store/chat").useChatStore.getState()
          chatStore.startNewChat && chatStore.startNewChat()
        } catch (er) {}
        setConversationId(null)
        // reset paging
        setMessagesPage((p) => ({ ...p, offset: 0 }))
        setHasMoreOlder(true)
        setLoadingOlder(false)
        return
      }

      // store the active id locally
      setConversationId(stored)

      // reset local chat state and pagination before loading new convo
      try {
        const chatStore = require("../../store/chat").useChatStore.getState()
        chatStore.startNewChat && chatStore.startNewChat()
      } catch (er) {}
      setMessagesPage((p) => ({ ...p, offset: 0 }))
      setHasMoreOlder(true)
      setLoadingOlder(false)

      try {
        // load initial page (most recent messages)
        const res = await getConversationMessages(stored, { limit: messagesPage.limit, offset: 0 })
        const serverMessages = res || []
        if (mounted) {
          try {
            const chatStore = require("../../store/chat").useChatStore.getState()
            // map and append
            const mapped = serverMessages.map((m) => ({
              id: m.id || Date.now() + Math.random(),
              role: m.sender === 'assistant' ? 'assistant' : 'user',
              content: m.message,
              timestamp: m.created_at || new Date(),
            }))
            mapped.forEach((mm) => chatStore.appendMessage && chatStore.appendMessage(mm))
            setMessagesPage((p) => ({ ...p, offset: mapped.length }))
            setHasMoreOlder(mapped.length === messagesPage.limit)
          } catch (e) {
            // ignore mapping errors
          }
        }
      } catch (e) {
        // if not found, clear stored id
        try {
          setStoredConversationId(null)
          setConversationId(null)
        } catch (er) {}
      }
    }
    hydratePaged()
    return () => { mounted = false }
    // re-run when the active conversation id or page size changes
  }, [authConversationId, messagesPage.limit])

  // infinite scroll: load older when scrolled to top
  useEffect(() => {
    if (!transcriptRef.current) return
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(async () => {
        try {
            if (transcriptRef.current.scrollTop <= 0 && hasMoreOlder && !loadingOlder && (conversationId || authConversationId)) {
            setLoadingOlder(true)
            try {
              const convoId = conversationId || authConversationId || useAuthStore.getState().conversationId
              const res = await getConversationMessages(convoId, { limit: messagesPage.limit, offset: messagesPage.offset })
              const older = res || []
              if (older.length) {
                const chatStore = require("../../store/chat").useChatStore.getState()
                // map and prepend older messages if not duplicates
                const mapped = older.map((m) => ({
                  id: m.id || Date.now() + Math.random(),
                  role: m.sender === 'assistant' ? 'assistant' : 'user',
                  content: m.message,
                  timestamp: m.created_at || new Date(),
                }))
                // prepend by resetting store then re-appending: keep existing then add older at front
                const current = chatStore.messages || []
                const dedup = mapped.filter(mu => !current.find(c => c.id === mu.id))
                if (dedup.length) {
                  // reset and reapply: older first, then existing
                  chatStore.startNewChat && chatStore.startNewChat()
                  dedup.forEach(m => chatStore.appendMessage && chatStore.appendMessage(m))
                  current.forEach(m => chatStore.appendMessage && chatStore.appendMessage(m))
                }
                setMessagesPage((p) => ({ ...p, offset: p.offset + older.length }))
                setHasMoreOlder(older.length === messagesPage.limit)
              } else {
                setHasMoreOlder(false)
              }
            } catch (e) {
              // ignore
            } finally {
              setLoadingOlder(false)
            }
          }
        } finally {
          ticking = false
        }
      })
    }
    const node = transcriptRef.current
    node.addEventListener('scroll', onScroll)
    return () => node.removeEventListener('scroll', onScroll)
  }, [transcriptRef.current, hasMoreOlder, loadingOlder, conversationId, messagesPage.offset, authConversationId])

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
      // persist user message to conversation if available (non-blocking)
      (async () => {
        try {
          const stored = conversationId || authConversationId || useAuthStore.getState().conversationId
          if (stored) {
            await addConversationMessage(stored, { sender: 'user', message: prompt })
          }
        } catch (e) {
          console.warn('[ChatPage] failed to persist user message', e)
          // mark last message as not saved (non-blocking)
          try {
            const chatStore = require("../../store/chat").useChatStore.getState()
            const msgs = chatStore.messages || []
            if (msgs.length) {
              const last = msgs[msgs.length - 1]
              last.notSaved = true
              // trigger store update by reapplying messages
              const keep = msgs.slice(0, msgs.length - 1)
              chatStore.startNewChat && chatStore.startNewChat()
              keep.forEach(m => chatStore.appendMessage && chatStore.appendMessage(m))
              chatStore.appendMessage && chatStore.appendMessage(last)
            }
          } catch (er) {}
        }
      })()
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
        // persist assistant reply (non-blocking)
        (async () => {
          try {
            const stored = conversationId || authConversationId || useAuthStore.getState().conversationId
            if (stored) {
              await addConversationMessage(stored, { sender: 'assistant', message: res.answer || '', citations: res.citations || [], metadata: res.metadata || {} })
            }
          } catch (e) {
            console.warn('[ChatPage] failed to persist assistant reply', e)
            try {
              const chatStore = require("../../store/chat").useChatStore.getState()
              const msgs = chatStore.messages || []
              if (msgs.length) {
                const last = msgs[msgs.length - 1]
                last.notSaved = true
                const keep = msgs.slice(0, msgs.length - 1)
                chatStore.startNewChat && chatStore.startNewChat()
                keep.forEach(m => chatStore.appendMessage && chatStore.appendMessage(m))
                chatStore.appendMessage && chatStore.appendMessage(last)
              }
            } catch (er) {}
          }
        })()
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
    // persist user message to conversation if available (non-blocking)
    ;(async () => {
      try {
        const stored = conversationId || authConversationId || useAuthStore.getState().conversationId
        if (stored) {
          await addConversationMessage(stored, { sender: 'user', message: q })
        }
      } catch (e) {
        console.warn('[ChatPage] failed to persist composer user message', e)
        // mark last message as not saved (non-blocking) — mirror seed-flow behavior
        try {
          const chatStore = require("../../store/chat").useChatStore.getState()
          const msgs = chatStore.messages || []
          if (msgs.length) {
            const last = msgs[msgs.length - 1]
            last.notSaved = true
            const keep = msgs.slice(0, msgs.length - 1)
            chatStore.startNewChat && chatStore.startNewChat()
            keep.forEach(m => chatStore.appendMessage && chatStore.appendMessage(m))
            chatStore.appendMessage && chatStore.appendMessage(last)
          }
        } catch (er) {}
      }
    })()
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
      // persist assistant reply (non-blocking)
      ;(async () => {
        try {
          const stored = conversationId || authConversationId || useAuthStore.getState().conversationId
          if (stored) {
            await addConversationMessage(stored, { sender: 'assistant', message: res.answer || '', citations: res.citations || [], metadata: res.metadata || {} })
          }
        } catch (e) {
          console.warn('[ChatPage] failed to persist composer assistant reply', e)
          try {
            const chatStore = require("../../store/chat").useChatStore.getState()
            const msgs = chatStore.messages || []
            if (msgs.length) {
              const last = msgs[msgs.length - 1]
              last.notSaved = true
              const keep = msgs.slice(0, msgs.length - 1)
              chatStore.startNewChat && chatStore.startNewChat()
              keep.forEach(m => chatStore.appendMessage && chatStore.appendMessage(m))
              chatStore.appendMessage && chatStore.appendMessage(last)
            }
          } catch (er) {}
        }
      })()

      // Optional: auto-title conversation after first Q&A (fire-and-forget, guard to avoid duplicates)
      try {
        const stored = conversationId || authConversationId || useAuthStore.getState().conversationId
        const msgs = useChatStore.getState().messages || []
        // If this is the first assistant reply (i.e., only one user+assistant exchange), call auto-title
        if (stored && msgs.filter(m => m.role === 'assistant').length === 1) {
          try {
            const uid = useAuthStore.getState().user?.id
            createConversationAutoTitle({ user_id: uid, question: q, answer: res.answer || '', genre: selectedGenre })
              .catch(() => {})
          } catch (_) {}
        }
      } catch (_) {}
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
  <div ref={transcriptRef} className="flex-1 overflow-y-auto pt-20 pb-6">
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
                placeholder={isLoading ? "Waiting for AI response..." : "Ask a follow-up question..."}
                disabled={isLoading}
                aria-busy={isLoading}
                className={`w-full bg-[#1a1a1a] border border-gray-700 rounded-xl py-4 pl-12 pr-16 text-white placeholder-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-colors ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
              <div className="absolute right-4 flex items-center gap-2">
                <button type="button" disabled={isLoading} className={`text-gray-400 hover:text-gray-300 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`} title="Attach file">
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
