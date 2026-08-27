import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Senior from './pages/Senior'
import Helper from './pages/Helper'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/senior" element={<Senior />} />
      <Route path="/helper" element={<Helper />} />
    </Routes>
  )
}
