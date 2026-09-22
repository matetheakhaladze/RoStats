import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Overview from './pages/Overview'
import Players from './pages/Players'
import Performance from './pages/Performance'
import Monetization from './pages/Monetization'
import Market from './pages/Market'
import Thumbnails from './pages/Thumbnails'
import Chatbot from './pages/Chatbot'
import Assets from './pages/Assets'
import SettingsPage from './pages/Settings'
import Billing from './pages/Billing'
import Reports from './pages/Reports'
import Journey from './pages/Journey'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="players" element={<Players />} />
          <Route path="performance" element={<Performance />} />
          <Route path="monetization" element={<Monetization />} />
          <Route path="market" element={<Market />} />
          <Route path="thumbnails" element={<Thumbnails />} />
          <Route path="chatbot" element={<Chatbot />} />
          <Route path="assets" element={<Assets />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="billing" element={<Billing />} />
          <Route path="reports" element={<Reports />} />
          <Route path="journey" element={<Journey />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
