import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase.js'
import CampList from './pages/CampList.jsx'
import CampDashboard from './pages/CampDashboard.jsx'
import Advisor from './pages/Advisor.jsx'
import CampForm from './components/CampForm.jsx'

function SetupBanner() {
  return (
    <div className="setup-banner">
      <h2>Supabase Not Configured</h2>
      <p>Create a <code>.env</code> file based on <code>.env.example</code> with your Supabase project credentials to get started.</p>
      <pre>{`VITE_SUPABASE_URL=https://your-project.supabase.co\nVITE_SUPABASE_ANON_KEY=your-anon-key-here`}</pre>
      <p>Then run the SQL migration in <code>supabase/migrations/001_initial.sql</code> in your Supabase SQL editor.</p>
    </div>
  )
}

export default function App() {
  const configured = isSupabaseConfigured()

  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <a href="/camps" className="app-logo">Camp Business Advisor</a>
        </header>
        {!configured && <SetupBanner />}
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/camps" replace />} />
            <Route path="/camps" element={<CampList />} />
            <Route path="/camps/new" element={<CampForm />} />
            <Route path="/camps/:id" element={<CampDashboard />} />
            <Route path="/camps/:id/advisor" element={<Advisor />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
