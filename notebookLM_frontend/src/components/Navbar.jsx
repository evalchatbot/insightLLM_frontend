"use client"

import { Link, NavLink, useNavigate } from "react-router-dom"
import { useAuthStore } from "../store/auth"
import { useEffect, useState } from "react"
import { listConversations, createConversationEmpty, updateConversation, deleteConversation, getStoredConversationId, setStoredConversationId } from "../api/endpoints"
import { PanelRight } from "lucide-react"


function sidebarNavClass({ isActive }) {
  return `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${isActive ? "bg-gray-800 text-white" : "text-gray-300"}`
}

export default function Sidebar() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [windowCollapsed, setWindowCollapsed] = useState(false)
  const [recentChats, setRecentChats] = useState([])
  const setConversationId = useAuthStore((s) => s.setConversationId)
  const authConversationId = useAuthStore((s) => s.conversationId)
  const COLLAPSE_BREAKPOINT = 768

  // effectiveCollapsed respects manual toggle OR automatic window collapse
  const effectiveCollapsed = isCollapsed || windowCollapsed

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", effectiveCollapsed)
    return () => document.body.classList.remove("sidebar-collapsed")
  }, [effectiveCollapsed])

  useEffect(() => {
    function handleResize() {
      setWindowCollapsed(window.innerWidth < COLLAPSE_BREAKPOINT)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  async function onLogout() {
    await logout()
    navigate("/")
  }

  useEffect(() => {
    let mounted = true
    async function fetchConvos() {
      try {
        const { data: { user } } = await (await import('../lib/supabase')).supabase.auth.getUser()
        const user_id = user?.id
        const res = await listConversations({ user_id, limit: 50 })
        if (mounted && res && res.conversations) setRecentChats(res.conversations)
      } catch (e) {
        // fail silently and leave recentChats empty
      }
    }
    fetchConvos()
    return () => { mounted = false }
  }, [])

  // Handlers
  const openConversation = (id) => {
    try {
      setConversationId(id)
    } catch (e) {}
    navigate('/chat')
  }

  const renameConversation = async (id, newTitle) => {
    const prev = recentChats
    try {
      // optimistic update
      setRecentChats((r) => r.map(c => c.id === id ? { ...c, title: newTitle } : c))
      await updateConversation(id, { title: newTitle })
    } catch (e) {
      // revert
      setRecentChats(prev)
    }
  }

  const deleteConversationHandler = async (id) => {
    const prev = recentChats
    try {
      setRecentChats((r) => r.filter(c => c.id !== id))
      await deleteConversation(id)
      // if deleted conversation was selected, clear stored id
      const stored = getStoredConversationId()
      if (stored === id) setStoredConversationId(null)
    } catch (e) {
      setRecentChats(prev)
    }
  }

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-black-900 border-r border-gray-700 z-40 transition-all duration-300 ease-in-out ${
        effectiveCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-3 border-b border-gray-700 min-h-[60px]">
          {!effectiveCollapsed && (
            <>
              <Link to="/" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                </div>
                <span className="font-medium text-white">InsightLM</span>
              </Link>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded-md text-gray-400 hover:text-white transition-colors"
              >
                <PanelRight className="w-4 h-4" />
              </button>
            </>
          )}
          {effectiveCollapsed && (
            <div className="w-full flex justify-center relative group">
              {/* Logo - visible by default, hidden on hover */}
              <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center group-hover:opacity-0 transition-opacity duration-200">
                <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
              </div>
              {/* Hamburger button - hidden by default, visible on hover */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute inset-0 flex items-center justify-center p-1.5 rounded-md text-gray-400 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100"
              >
                <PanelRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

            <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {/* New chat: reset chat state + session, then navigate to /chat */}
            <button
              onClick={async () => {
                try {
                  localStorage.removeItem("chat.seedPrompt")
                } catch (e) {}
                // call zustand action to clear chat
                try {
                  const startNewChat = require("../store/chat").useChatStore.getState().startNewChat
                  if (startNewChat) startNewChat()
                } catch (e) {}
                // reset session id in auth store
                try {
                  const setSessionId = require("../store/auth").useAuthStore.getState().setSessionId
                  if (setSessionId) setSessionId(null)
                } catch (e) {}

                          // create conversation on server and store id in auth store
                          try {
                            const convo = await createConversationEmpty()
                            if (convo && convo.id) {
                              setConversationId(convo.id)
                              // persist the selected conversation id to localStorage for refresh
                              try { setStoredConversationId(convo.id) } catch (er) {}
                              console.debug('[Sidebar] new-chat OK', convo.id)
                            }
                          } catch (e) {
                            // ignore failures here; fallback to local-only chat
                          }

                navigate("/chat")
              }}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                effectiveCollapsed ? "justify-center px-2 text-gray-300" : "text-gray-300"
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {!isCollapsed && <span>New chat</span>}
            </button>

            <button
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 w-full transition-colors ${
                effectiveCollapsed ? "justify-center px-2" : "justify-start"
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {!effectiveCollapsed && <span>Search chats</span>}
            </button>

            <NavLink
              to="/library"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? "bg-gray-800 text-white" : "text-gray-300"
                } ${effectiveCollapsed ? "justify-center px-2" : ""}`
              }
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              {!effectiveCollapsed && <span>Library</span>}
            </NavLink>
          </div>

          <div
            className={`transition-all duration-300 ease-in-out ${
              effectiveCollapsed ? "opacity-0 max-h-0 overflow-hidden" : "opacity-100 max-h-96"
            }`}
          >
            <div className="px-2 py-4 border-t border-gray-700">
              <div className="space-y-1">
                {recentChats.map((chat) => (
                  <div key={chat.id} className="flex items-center justify-between w-full px-1">
                    <button
                      onClick={() => openConversation(chat.id)}
                      className="flex items-center gap-3 w-full py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition-colors text-left"
                    >
                      <span className="truncate">{chat.title}</span>
                    </button>
                    <div className="flex items-center gap-2 ml-2">
                      {/* simple edit: click title to rename via prompt (keeps UI minimal) */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          const newTitle = prompt('Rename conversation', chat.title)
                          if (newTitle && newTitle.trim() && newTitle.trim() !== chat.title) {
                            await renameConversation(chat.id, newTitle.trim())
                          }
                        }}
                        className="text-gray-400 hover:text-white p-1"
                        title="Rename"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (confirm('Delete this conversation?')) await deleteConversationHandler(chat.id)
                        }}
                        className="text-gray-400 hover:text-white p-1"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {token && (
          <div className="border-t border-gray-700 p-3">
            <div className={`flex items-center ${effectiveCollapsed ? "justify-center" : "gap-3"}`}>
              <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-white">
                  {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                </span>
              </div>
              {!effectiveCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">
                      {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
                    </div>
                    <div className="text-xs text-gray-400">Plus</div>
                  </div>
                  <button
                    onClick={onLogout}
                    className="p-1 rounded text-gray-400 hover:text-white transition-colors"
                    title="Sign out"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {!token && (
          <div
            className={`border-t border-gray-700 transition-all duration-300 ease-in-out ${
              effectiveCollapsed ? "opacity-0 max-h-0 overflow-hidden p-0" : "opacity-100 max-h-24 p-3"
            }`}
          >
            <div className="space-y-2">
              <Link
                to="/login"
                className="block w-full px-3 py-2 text-center rounded-lg border border-gray-600 text-gray-300 text-sm"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="block w-full px-3 py-2 text-center rounded-lg bg-white text-gray-900 text-sm font-medium"
              >
                Sign up
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
