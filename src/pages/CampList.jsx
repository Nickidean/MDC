import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

export default function CampList() {
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    fetchCamps()
  }, [])

  async function fetchCamps() {
    try {
      const { data, error } = await supabase
        .from('camps')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCamps(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading"><span className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <h1>Your Camps</h1>
        <Link to="/camps/new" className="btn btn-primary">+ New Camp</Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!isSupabaseConfigured() && (
        <div className="alert alert-info">Configure Supabase credentials to start using the app.</div>
      )}

      {camps.length === 0 && !loading && isSupabaseConfigured() && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
          <p style={{ marginBottom: '1rem' }}>No camps yet. Create your first camp to get started.</p>
          <Link to="/camps/new" className="btn btn-primary">Create Camp</Link>
        </div>
      )}

      <div className="camp-list">
        {camps.map(camp => (
          <Link key={camp.id} to={`/camps/${camp.id}`} className="camp-card">
            <div>
              <div className="camp-card-name">{camp.name}</div>
              <div className="camp-card-meta">
                {camp.start_date && `${camp.start_date} – ${camp.end_date || '?'} · `}
                {camp.days} day{camp.days !== 1 ? 's' : ''} · {camp.capacity_per_day} places/day
              </div>
            </div>
            <span className="camp-card-arrow">›</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
