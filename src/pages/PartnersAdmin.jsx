import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

function PartnerRow({ partner, onUpdated, onDeleted }) {
  const [fields, setFields] = useState({
    name: partner.name || '',
    link_url: partner.link_url || '',
    image_url: partner.image_url || '',
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
    const { error } = await supabase.from('partner_logos').update(updated).eq('id', partner.id)
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
    const path = `partner-${partner.id}-${Date.now()}.${ext}`
    const { error: storageError } = await supabase.storage.from('camp-images').upload(path, file, { upsert: true })
    if (storageError) { console.error('Upload error:', storageError); setUploading(false); return }
    const { data } = supabase.storage.from('camp-images').getPublicUrl(path)
    const updated = { ...fields, image_url: data.publicUrl }
    setFields(updated)
    await persist(updated)
    setUploading(false)
  }

  async function handleDelete() {
    if (!confirm(`Remove ${fields.name || 'this logo'}?`)) return
    await supabase.from('partner_logos').delete().eq('id', partner.id)
    onDeleted && onDeleted()
  }

  return (
    <div className="guest-admin-row">
      <div
        onClick={() => fileRef.current?.click()}
        title={uploading ? 'Uploading…' : 'Upload logo'}
        style={{ width: 100, height: 64, borderRadius: 8, border: '2px dashed var(--border)', overflow: 'hidden', cursor: 'pointer', flexShrink: 0, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {fields.image_url
          ? <img src={fields.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{uploading ? '…' : '+ Logo'}</span>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

      <div className="guest-admin-fields">
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <input
            type="text"
            value={fields.name}
            onChange={e => handleChange('name', e.target.value)}
            placeholder="e.g. Dorset Council"
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
        <input
          type="text"
          value={fields.link_url}
          onChange={e => handleChange('link_url', e.target.value)}
          placeholder="Optional link, e.g. https://www.dorsetcouncil.gov.uk"
          className="field-input"
        />
      </div>
    </div>
  )
}

export default function PartnersAdmin() {
  const [partners, setPartners] = useState(null)

  async function load() {
    const { data } = await supabase.from('partner_logos').select('*').order('sort_index').order('created_at')
    setPartners(data || [])
  }

  useEffect(() => { load() }, [])

  async function addPartner() {
    const maxSort = partners.length ? Math.max(...partners.map(p => p.sort_index)) : -1
    const { data, error } = await supabase
      .from('partner_logos')
      .insert({ name: '', link_url: '', image_url: '', sort_index: maxSort + 1 })
      .select().single()
    if (!error) setPartners(prev => [...prev, data])
  }

  if (partners === null) return <div className="loading">Loading…</div>

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Partner Logos</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Add logos for funders, councils or partners (e.g. Dorset Council) — they'll appear in a row on the public site.
          </p>
        </div>
        <button className="btn btn-primary" onClick={addPartner}>+ Add logo</button>
      </div>

      {partners.length === 0 ? (
        <div className="empty-state"><p>No partner logos yet. Click <strong>+ Add logo</strong> to get started.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {partners.map(p => <PartnerRow key={p.id} partner={p} onUpdated={load} onDeleted={load} />)}
        </div>
      )}
    </div>
  )
}
