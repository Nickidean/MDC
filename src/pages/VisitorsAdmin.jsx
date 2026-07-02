import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function VisitorsAdmin() {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    supabase
      .from('site_visits')
      .select('*')
      .order('date', { ascending: false })
      .limit(60)
      .then(({ data }) => setRows(data || []))
  }, [])

  if (rows === null) return <div className="loading">Loading…</div>

  const today = new Date().toISOString().slice(0, 10)
  const todayCount = rows.find(r => r.date === today)?.views || 0
  const last7 = rows.slice(0, 7).reduce((s, r) => s + r.views, 0)
  const last30 = rows.slice(0, 30).reduce((s, r) => s + r.views, 0)
  const maxViews = Math.max(1, ...rows.map(r => r.views))

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Site Visitors</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Page views on the public site, counted once per browser session.
        </p>
      </div>

      <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="metric-card metric-neutral">
          <div className="metric-label">Today</div>
          <div className="metric-value">{todayCount}</div>
        </div>
        <div className="metric-card metric-neutral">
          <div className="metric-label">Last 7 days</div>
          <div className="metric-value">{last7}</div>
        </div>
        <div className="metric-card metric-neutral">
          <div className="metric-label">Last 30 days</div>
          <div className="metric-value">{last30}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state"><p>No visits recorded yet.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {rows.map(r => (
            <div key={r.date} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 110, flexShrink: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(r.date)}</div>
              <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 4, overflow: 'hidden', height: 20 }}>
                <div style={{ width: `${(r.views / maxViews) * 100}%`, background: 'var(--primary)', height: '100%', borderRadius: 4 }} />
              </div>
              <div style={{ width: 40, flexShrink: 0, textAlign: 'right', fontSize: '0.85rem', fontWeight: 700 }}>{r.views}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
