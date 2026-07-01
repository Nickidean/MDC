import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

function GuestRow({ guest, onUpdated, onDeleted }) {
  const [fields, setFields] = useState({
    name: guest.name || '',
    bio: guest.bio || '',
    image_url: guest.image_url || '',
    tag: guest.tag || '',
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
      .from('special_guests')
      .update({ name: updated.name, bio: updated.bio, image_url: updated.image_url, tag: updated.tag })
      .eq('id', guest.id)
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

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `guest-${guest.id}-${Date.now()}.${ext}`
    const { error: storageError } = await supabase.storage
      .from('camp-images')
      .upload(path, file, { upsert: true })
    if (storageError) {
      console.error('Upload error:', storageError)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('camp-images').getPublicUrl(path)
    const updated = { ...fields, image_url: data.publicUrl }
    setFields(updated)
    await persist(updated)
    setUploading(false)
  }

  async function handleDelete() {
    if (!confirm(`Remove ${fields.name || 'this guest'}?`)) return
    await supabase.from('special_guests').delete().eq('id', guest.id)
    onDeleted && onDeleted()
  }

  return (
    <div className="guest-admin-row">
      <div
        className="guest-avatar-upload guest-avatar-upload-lg"
        onClick={() => fileRef.current?.click()}
        title={uploading ? 'Uploading…' : 'Upload photo'}
        style={{ cursor: 'pointer', flexShrink: 0 }}
      >
        {fields.image_url ? (
          <img src={fields.image_url} alt="" className="guest-avatar-img" />
        ) : (
          <span className="guest-avatar-placeholder">{uploading ? '…' : '+'}</span>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

      <div className="guest-admin-fields">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="text"
            value={fields.name}
            onChange={e => handleChange('name', e.target.value)}
            placeholder="Guest name or role"
            className="field-input"
            style={{ flex: 1 }}
          />
          <input
            type="text"
            value={fields.tag}
            onChange={e => handleChange('tag', e.target.value)}
            placeholder="Tag, e.g. Public speaking"
            className="field-input"
            style={{ flex: 1 }}
          />
          {saveStatus && (
            <span className={`autosave-indicator ${saveStatus}`} style={{ flexShrink: 0 }}>
              {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
            </span>
          )}
          <button className="btn-icon btn-icon-danger" onClick={handleDelete} title="Remove guest">✕</button>
        </div>
        <textarea
          value={fields.bio}
          onChange={e => handleChange('bio', e.target.value)}
          placeholder="Who are they and what will they be doing at camp…"
          className="field-textarea"
          rows={3}
        />
      </div>
    </div>
  )
}

export default function GuestsAdmin() {
  const [guests, setGuests] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('special_guests')
      .select('*')
      .order('sort_index')
      .order('created_at')
    setGuests(data || [])
  }

  useEffect(() => { load() }, [])

  async function addGuest() {
    const maxSort = guests.length ? Math.max(...guests.map(g => g.sort_index)) : -1
    const { data, error } = await supabase
      .from('special_guests')
      .insert({ name: '', bio: '', image_url: '', tag: '', sort_index: maxSort + 1 })
      .select()
      .single()
    if (!error) setGuests(prev => [...prev, data])
  }

  if (guests === null) return <div className="loading">Loading…</div>

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>Special Guests</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Add a photo, name, tag and short bio for each guest — they'll appear on the public site.
          </p>
        </div>
        <button className="btn btn-primary" onClick={addGuest}>+ Add guest</button>
      </div>

      {guests.length === 0 ? (
        <div className="empty-state">
          <p>No guests yet. Click <strong>+ Add guest</strong> to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {guests.map(g => (
            <GuestRow key={g.id} guest={g} onUpdated={load} onDeleted={load} />
          ))}
        </div>
      )}
    </div>
  )
}
