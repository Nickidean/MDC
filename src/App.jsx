import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase.js'
import { getSession, onAuthChange } from './lib/auth.js'
import CampList from './pages/CampList.jsx'
import CampDashboard from './pages/CampDashboard.jsx'
import Advisor from './pages/Advisor.jsx'
import CampForm from './components/CampForm.jsx'
import Login from './pages/Login.jsx'
import AuthGuard from './components/AuthGuard.jsx'
import DayPlanner from './pages/DayPlanner.jsx'
import GuestsAdmin from './pages/GuestsAdmin.jsx'
import DailyStructureAdmin from './pages/DailyStructureAdmin.jsx'
import SiteContentAdmin from './pages/SiteContentAdmin.jsx'
import TeamAdmin from './pages/TeamAdmin.jsx'
import PartnersAdmin from './pages/PartnersAdmin.jsx'
import VisitorsAdmin from './pages/VisitorsAdmin.jsx'
import PublicSite from './pages/PublicSite.jsx'

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

function AppShell({ configured, session }) {
  return (
    <div className="app">
      <header className="app-header">
        <a href="/admin/camps" className="app-logo">Camp Business Advisor</a>
        {session && (
          <nav className="app-nav">
            <Link to="/admin/planner" className="app-nav-link">Day Planner</Link>
            <Link to="/admin/guests" className="app-nav-link">Special Guests</Link>
            <Link to="/admin/daily-structure" className="app-nav-link">Daily Structure</Link>
            <Link to="/admin/team" className="app-nav-link">Team</Link>
            <Link to="/admin/partners" className="app-nav-link">Partners</Link>
            <Link to="/admin/about" className="app-nav-link">Site Content</Link>
            <Link to="/admin/visitors" className="app-nav-link">Visitors</Link>
            <a href="/" target="_blank" rel="noopener noreferrer" className="app-nav-link" style={{ fontSize: '0.85rem', opacity: 0.8 }}>View public site ↗</a>
          </nav>
        )}
      </header>
      {!configured && <SetupBanner />}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="camps" replace />} />
          <Route path="camps" element={<CampList />} />
          <Route path="camps/new" element={<CampForm />} />
          <Route path="camps/:id" element={<CampDashboard />} />
          <Route path="camps/:id/advisor" element={<Advisor />} />
          <Route path="login" element={<Login />} />
          <Route path="planner" element={
            <AuthGuard>
              <DayPlanner />
            </AuthGuard>
          } />
          <Route path="guests" element={
            <AuthGuard>
              <GuestsAdmin />
            </AuthGuard>
          } />
          <Route path="daily-structure" element={
            <AuthGuard>
              <DailyStructureAdmin />
            </AuthGuard>
          } />
          <Route path="about" element={
            <AuthGuard>
              <SiteContentAdmin />
            </AuthGuard>
          } />
          <Route path="team" element={
            <AuthGuard>
              <TeamAdmin />
            </AuthGuard>
          } />
          <Route path="partners" element={
            <AuthGuard>
              <PartnersAdmin />
            </AuthGuard>
          } />
          <Route path="visitors" element={
            <AuthGuard>
              <VisitorsAdmin />
            </AuthGuard>
          } />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const configured = isSupabaseConfigured()
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    getSession().then(({ data }) => setSession(data.session || null))
    const { data: listener } = onAuthChange((_event, sess) => setSession(sess))
    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicSite />} />
        <Route path="/admin/*" element={<AppShell configured={configured} session={session} />} />
      </Routes>
    </BrowserRouter>
  )
}
