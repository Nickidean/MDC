import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

function SlotRow({ slot, onUpdated, onDeleted }) {
  const [fields, setFields] = useState({
    emoji: slot.emoji || '',
    time_label: slot.time_label || '',
    activity: slot.activity || '',
    description: slot.description || '',
    image_url: slot.image_url || '',
  })
  const [saveStatus, setSaveStatus] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const saveTimer = useRef(null)

  function scheduleSave(updated) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persist(updated), 800)
  }

  async function persist(updated) {
    setSaveStatus('saving')
    const { error } = await supabase
      .from('daily_structure')
      .update(updated)
      .eq('id', slot.id)
    if (!error) {
      setSaveStatus('saved')
      onUpdated && onUpdated()
      setTimeout(() => setSaveStatus(''), 2000)
    } else {
      setSaveStatus('')
      console.error('Save error:', error)
    }
  }

  function handleChange(field, value) {
    const updated = { ...fields, [field]: value }
    setFields(updated)
    scheduleSave(updated)
  }

  async function handleDelete() {
    if (!confirm(`Remove "${fields.time_label || 'this slot'}"?`)) return
    await supabase.from('daily_structure').delete().eq('id', slot.id)
    onDeleted && onDeleted()
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `daily-structure-${slot.id}-${Date.now()}.${ext}`
    const { error: storageError } = await supabase.storage.from('camp-images').upload(path, file, { upsert: true })
    if (storageError) { console.error('Upload error:', storageError); setUploading(false); return }
    const { data } = supabase.storage.from('camp-images').getPublicUrl(path)
    const updated = { ...fields, image_url: data.publicUrl }
    setFields(updated)
    await persist(updated)
    setUploading(false)
  }

  return (
    <div className="day-slot-admin-row">
      <div className="day-slot-admin-accent" />
      <div
        onClick={() => fileRef.current?.click()}
        title={uploading ? 'Uploading…' : 'Upload thumbnail'}
        style={{ width: 90, height: 90, borderRadius: 8, border: '2px dashed var(--border)', overflow: 'hidden', cursor: 'pointer', flexShrink: 0, margin: '0.75rem 0 0.75rem 0.75rem', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {fields.image_url
          ? <img src={fields.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0 0.4rem' }}>{uploading ? '…' : '+ Photo'}</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
      <div className="day-slot-admin-content">
        <div className="day-slot-admin-top">
          <input
            type="text"
            value={fields.emoji}
            onChange={e => handleChange('emoji', e.target.value)}
            placeholder="🌅"
            className="field-input day-slot-emoji-input"
            title="Emoji"
          />
          <input
            type="text"
            value={fields.time_label}
            onChange={e => handleChange('time_label', e.target.value)}
            placeholder="e.g. Morning"
            className="field-input"
            style={{ flex: 1 }}
          />
          <input
            type="text"
            value={fields.activity}
            onChange={e => handleChange('activity', e.target.value)}
            placeholder="Activity title"
            className="field-input"
            style={{ flex: 2 }}
          />
          {saveStatus && (
            <span className={`autosave-indicator ${saveStatus}`} style={{ flexShrink: 0 }}>
              {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
            </span>
          )}
          <button className="btn-icon btn-icon-danger" onClick={handleDelete} title="Remove slot">✕</button>
        </div>
        <textarea
          value={fields.description}
          onChange={e => handleChange('description', e.target.value)}
          placeholder="Description shown on the public site…"
          className="field-textarea"
          rows={2}
        />
      </div>
    </div>
  )
}

export default function DailyStructureAdmin() {
  const [slots, setSlots] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('daily_structure')
      .select('*')
      .order('sort_index')
    setSlots(data || [])
  }

  useEffect(() => { load() }, [])

  async function addSlot() {
    const maxSort = slots.length ? Math.max(...slots.map(s => s.sort_index)) : -1
    const { data, error } = await supabase
      .from('daily_structure')
      .insert({ emoji: '', time_label: '', activity: '', description: '', image_url: '', sort_index: maxSort + 1 })
      .select()
      .single()
    if (!error) setSlots(prev => [...prev, data])
  }

  if (slots === null) return <div className="loading">Loading…</div>

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>Daily Structure</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Edit the time slots shown in the "The daily structure" section on the public site.
          </p>
        </div>
        <button className="btn btn-primary" onClick={addSlot}>+ Add slot</button>
      </div>

      {slots.length === 0 ? (
        <div className="empty-state">
          <p>No slots yet. Click <strong>+ Add slot</strong> to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {slots.map(s => (
            <SlotRow key={s.id} slot={s} onUpdated={load} onDeleted={load} />
          ))}
        </div>
      )}
    </div>
  )
}
