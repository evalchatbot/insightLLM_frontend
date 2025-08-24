import { Routes, Route, Navigate } from "react-router-dom"
import Navbar from "../components/Navbar.jsx"
import Login from "../features/auth/Login.jsx"
import SignUp from "../features/auth/SignUp.jsx"
import ChatPage from "../features/chat/ChatPage.jsx"
import IngestPage from "../features/ingest/IngestPage.jsx"
import McqPage from "../features/mcq/McqPage.jsx"
import Home from "../features/home/Home.jsx"
import { useAuthStore } from "../store/auth"
import { useEnsureSession } from "../hooks/useEnsureSession"
import '../index.css'

function Protected({ children }) {
  const token = useAuthStore((s) => s.accessToken)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  // auto-create server session after login (once per app load)
  useEnsureSession()

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={
            <div className="max-w-6xl mx-auto px-4 py-6">
              <Login />
            </div>
          }
        />
        <Route
          path="/signup"
          element={
            <div className="max-w-6xl mx-auto px-4 py-6">
              <SignUp />
            </div>
          }
        />

        <Route
          path="/chat"
          element={
            <Protected>
              <div className="max-w-6xl mx-auto px-4 py-6">
                <ChatPage />
              </div>
            </Protected>
          }
        />
        <Route
          path="/ingest"
          element={
            <Protected>
              <div className="max-w-6xl mx-auto px-4 py-6">
                <IngestPage />
              </div>
            </Protected>
          }
        />
        <Route
          path="/mcq"
          element={
            <Protected>
              <div className="max-w-6xl mx-auto px-4 py-6">
                <McqPage />
              </div>
            </Protected>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
