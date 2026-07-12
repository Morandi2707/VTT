import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LobbyPage } from '@/app/pages/LobbyPage'
import { LoginPage } from '@/app/pages/LoginPage'
import { RoomPage } from '@/app/pages/RoomPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<LobbyPage />} />
        <Route path="/mesa/:roomId" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
