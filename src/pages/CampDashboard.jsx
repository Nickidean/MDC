import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { computeMetrics } from '../lib/metrics.js'
import Dashboard from '../components/Dashboard.jsx'
import BookingTable from '../components/BookingTable.jsx'
import CostTable from '../components/CostTable.jsx'
import FundingTable from '../components/FundingTable.jsx'
import ImportCSV from '../components/ImportCSV.jsx'
import CampForm from '../components/CampForm.jsx'

const TABS = ['overview', 'bookings', 'costs', 'funding', 'import']

export default function CampDashboard() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const tab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'overview'
  const setTab = (t) => setSearchParams({ tab: t })

  const [camp, setCamp] = useState(null)
  const [bookings, setBookings] = useState([])
  const [costs, setCosts] = useState([])
  const [funding, setFunding] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true)
      const [campRes, bookingsRes, costsRes, fundingRes] = await Promise.all([
        supabase.from('camps').select('*').eq('id', id).single(),
        supabase.from('bookings').select('*').eq('camp_id', id).order('created_at'),
        supabase.from('costs').select('*').eq('camp_id', id).order('created_at'),
        supabase.from('funding').select('*').eq('camp_id', id).order('created_at'),
      ])
      if (campRes.error) throw campRes.error
      setCamp(campRes.data)
      setBookings(bookingsRes.data || [])
      setCosts(costsRes.data || [])
      setFunding(fundingRes.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) return <div className="loading"><span className="spinner" /></div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (!camp) return <div className="alert alert-error">Camp not found.</div>

  const metrics = computeMetrics(camp, bookings, costs, funding)

  if (editing) {
    return (
      <div>
        <div style={{ marginBottom: '1rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>← Back</button>
        </div>
        <CampForm camp={camp} onSaved={(updated) => { setCamp(updated); setEditing(false) }} />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <Link to="/camps" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none' }}>← All Camps</Link>
          <h1>{camp.name}</h1>
          {camp.start_date && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {camp.start_date} – {camp.end_date || '?'} · {camp.days} days · {camp.capacity_per_day} places/day
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Edit Camp</button>
          <Link to={`/camps/${id}/advisor`} className="btn btn-primary btn-sm">Ask Advisor</Link>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Dashboard camp={camp} metrics={metrics} bookings={bookings} costs={costs} funding={funding} />}
      {tab === 'bookings' && <BookingTable campId={id} bookings={bookings} onChanged={fetchAll} />}
      {tab === 'costs' && <CostTable campId={id} costs={costs} onChanged={fetchAll} />}
      {tab === 'funding' && <FundingTable campId={id} funding={funding} onChanged={fetchAll} />}
      {tab === 'import' && <ImportCSV campId={id} onImported={fetchAll} />}
    </div>
  )
}
