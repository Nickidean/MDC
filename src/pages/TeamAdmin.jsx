import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

function TeamMemberRow({ member, onUpdated, onDeleted }) {
  const [fields, setFields] = useState({
    name: member.name || '',
    role: member.role || '',
    bio: member.bio || '',
    image_url: member.image_url || '',
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
    const { error } = await supabase.from('team_members').update(updated).eq('id', member.id)
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
    const path = `team-${member.id}-${Date.now()}.${ext}`
    const { error: storageError } = await supabase.storage.from('camp-images').upload(path, file, { upsert: true })
    if (storageError) { console.error('Upload error:', storageError); setUploading(false); return }
    const { data } = supabase.storage.from('camp-images').getPublicUrl(path)
    const updated = { ...fields, image_url: data.publicUrl }
    setFields(updated)
    await persist(updated)
    setUploading(false)
  }

  async function handleDelete() {
    if (!confirm(`Remove ${fields.name || 'this team member'}?`)) return
    await supabase.from('team_members').delete().eq('id', member.id)
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
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <input
            type="text"
            value={fields.name}
            onChange={e => handleChange('name', e.target.value)}
            placeholder="Name"
            className="field-input"
            style={{ flex: 1 }}
          />
          <input
            type="text"
            value={fields.role}
            onChange={e => handleChange('role', e.target.value)}
            placeholder="Role or title"
            className="field-input"
            style={{ flex: 1 }}
          />
          {saveStatus && (
            <span className={`autosave-indicator ${saveStatus}`} style={{ flexShrink: 0 }}>
              {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
            </span>
          )}
          <button className="btn-icon btn-icon-danger" onClick={handleDelete} title="Remove">✕</button>
        </div>
        <textarea
          value={fields.bio}
          onChange={e => handleChange('bio', e.target.value)}
          placeholder="A short bio…"
          className="field-textarea"
          rows={2}
        />
      </div>
    </div>
  )
}

export default function TeamAdmin() {
  const [members, setMembers] = useState(null)

  async function load() {
    const { data } = await supabase.from('team_members').select('*').order('sort_index').order('created_at')
    setMembers(data || [])
  }

  useEffect(() => { load() }, [])

  async function addMember() {
    const maxSort = members.length ? Math.max(...members.map(m => m.sort_index)) : -1
    const { data, error } = await supabase
      .from('team_members')
      .insert({ name: '', role: '', bio: '', image_url: '', sort_index: maxSort + 1 })
      .select().single()
    if (!error) setMembers(prev => [...prev, data])
  }

  if (members === null) return <div className="loading">Loading…</div>

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Meet the Team</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Add your team members — they'll appear in a grid on the public site.
          </p>
        </div>
        <button className="btn btn-primary" onClick={addMember}>+ Add member</button>
      </div>

      {members.length === 0 ? (
        <div className="empty-state"><p>No team members yet. Click <strong>+ Add member</strong> to get started.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {members.map(m => <TeamMemberRow key={m.id} member={m} onUpdated={load} onDeleted={load} />)}
        </div>
      )}
    </div>
  )
}
