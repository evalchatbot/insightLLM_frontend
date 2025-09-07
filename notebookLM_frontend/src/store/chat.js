import { create } from "zustand"
import { persist } from "zustand/middleware"

export const useChatStore = create(
  persist(
    (set, get) => ({
      // UI / flow
      isChatMode: false,
      isLoading: false,

      // conversation
      messages: [],          // [{ id, role: "user"|"assistant", content, timestamp }]
      seedPrompt: null,      // first message handed from Home → Chat
      selectedGenre: "All Genres",

      // actions
      enterChat: (seed) => set({ isChatMode: true, seedPrompt: seed ?? null }),
      exitChat: () => set({ isChatMode: false }),

      appendMessage: (msg) => set({ messages: [...get().messages, msg] }),
      clearSeedPrompt: () => set({ seedPrompt: null }),
      clearChat: () => set({ messages: [], seedPrompt: null }),

      setIsLoading: (v) => set({ isLoading: v }),
      setSelectedGenre: (g) => set({ selectedGenre: g }),

      // Resets all chat state for a new chat
      startNewChat: () => set({
        isChatMode: false,
        isLoading: false,
        messages: [],
        seedPrompt: null,
        selectedGenre: "All Genres",
      }),
    }),
    { name: "insightlm.chat" } // persists to localStorage for refresh resilience
  )
)
