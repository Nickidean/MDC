import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const EMPTY = {
  name: '',
  start_date: '',
  end_date: '',
  days: '',
  capacity_per_day: '',
  price_day: '',
  price_week: '',
  price_two_week: '',
  haf_places: '',
  notes: '',
}

export default function CampForm({ camp, onSaved }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(camp ? {
    name: camp.name || '',
    start_date: camp.start_date || '',
    end_date: camp.end_date || '',
    days: camp.days ?? '',
    capacity_per_day: camp.capacity_per_day ?? '',
    price_day: camp.price_day ?? '',
    price_week: camp.price_week ?? '',
    price_two_week: camp.price_two_week ?? '',
    haf_places: camp.haf_places ?? '',
    notes: camp.notes || '',
  } : { ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function validate() {
    if (!form.name.trim()) return 'Camp name is required.'
    if (!form.days || Number(form.days) < 1) return 'Number of days must be at least 1.'
    if (!form.capacity_per_day || Number(form.capacity_per_day) < 1) return 'Capacity per day must be at least 1.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    setSaving(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      days: Number(form.days),
      capacity_per_day: Number(form.capacity_per_day),
      price_day: Number(form.price_day) || 0,
      price_week: Number(form.price_week) || 0,
      price_two_week: Number(form.price_two_week) || 0,
      haf_places: Number(form.haf_places) || 0,
      notes: form.notes.trim() || null,
    }

    try {
      if (camp) {
        const { data, error } = await supabase.from('camps').update(payload).eq('id', camp.id).select().single()
        if (error) throw error
        onSaved && onSaved(data)
      } else {
        const { data, error } = await supabase.from('camps').insert(payload).select().single()
        if (error) throw error
        navigate(`/camps/${data.id}`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="page-title">{camp ? 'Edit Camp' : 'New Camp'}</h1>
      <div className="card">
        <form className="form" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>Camp Name *</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Summer Adventure Camp 2025" required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Number of Days *</label>
              <input type="number" min="1" value={form.days} onChange={e => set('days', e.target.value)} placeholder="e.g. 10" required />
            </div>
            <div className="form-group">
              <label>Capacity per Day *</label>
              <input type="number" min="1" value={form.capacity_per_day} onChange={e => set('capacity_per_day', e.target.value)} placeholder="e.g. 20" required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Day Price (£)</label>
              <input type="number" min="0" step="0.01" value={form.price_day} onChange={e => set('price_day', e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Week Price (£)</label>
              <input type="number" min="0" step="0.01" value={form.price_week} onChange={e => set('price_week', e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Two-Week Price (£)</label>
              <input type="number" min="0" step="0.01" value={form.price_two_week} onChange={e => set('price_two_week', e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="form-group" style={{ maxWidth: '200px' }}>
            <label>HAF Places Allocated</label>
            <input type="number" min="0" value={form.haf_places} onChange={e => set('haf_places', e.target.value)} placeholder="e.g. 50" />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes about this camp…" />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => camp ? onSaved && onSaved(camp) : navigate('/camps')}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : (camp ? 'Save Changes' : 'Create Camp')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
