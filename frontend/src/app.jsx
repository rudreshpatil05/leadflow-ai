import { BrowserRouter, Routes, Route } from "react-router-dom"

import Dashboard from "./pages/Dashboard"
import LeadDetails from "./pages/LeadDetails"
import CreateLead from "./pages/CreateLead"
import Pipeline from "./pages/Pipeline"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />

        <Route
          path="/leads/new"
          element={<CreateLead />}
        />

        <Route
          path="/leads/:id"
          element={<LeadDetails />}
        />

        <Route
          path="/pipeline"
          element={<Pipeline />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App