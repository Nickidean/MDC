import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function SiteContentAdmin() {
  const [fields, setFields] = useState({ organiser_name: '', organiser_intro: '', organiser_image_url: '' })
  const [saveStatus, setSaveStatus] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const saveTimer = useRef(null)

  useEffect(() => {
    supabase.from('site_content').select('*').eq('id', 1).maybeSingle()
      .then(({ data }) => { if (data) setFields({ organiser_name: data.organiser_name, organiser_intro: data.organiser_intro, organiser_image_url: data.organiser_image_url }) })
  }, [])

  function scheduleSave(updated) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persist(updated), 800)
  }

  async function persist(updated) {
    setSaveStatus('saving')
    const { error } = await supabase.from('site_content').upsert({ id: 1, ...updated })
    if (!error) {
      setSaveStatus('saved')
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
    const path = `organiser-${Date.now()}.${ext}`
    const { error: storageError } = await supabase.storage.from('camp-images').upload(path, file, { upsert: true })
    if (storageError) { console.error('Upload error:', storageError); setUploading(false); return }
    const { data } = supabase.storage.from('camp-images').getPublicUrl(path)
    const updated = { ...fields, organiser_image_url: data.publicUrl }
    setFields(updated)
    await persist(updated)
    setUploading(false)
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>About the Organiser</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Add a photo and intro — shown on the public site to help families put a face to the camp.
        </p>
      </div>

      <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Photo upload */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div
            className="organiser-photo-upload"
            onClick={() => fileRef.current?.click()}
            title={uploading ? 'Uploading…' : 'Upload photo'}
          >
            {fields.organiser_image_url ? (
              <img src={fields.organiser_image_url} alt="" className="organiser-photo-img" />
            ) : (
              <span className="organiser-photo-placeholder">{uploading ? '…' : '+'}</span>
            )}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click to upload</span>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
        </div>

        {/* Fields */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label className="field-label" style={{ flex: 1, margin: 0 }}>
              Your name
              <input
                type="text"
                value={fields.organiser_name}
                onChange={e => handleChange('organiser_name', e.target.value)}
                placeholder="e.g. Sarah Jones"
                className="field-input"
              />
            </label>
            {saveStatus && (
              <span className={`autosave-indicator ${saveStatus}`} style={{ flexShrink: 0, marginTop: '1.4rem' }}>
                {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
              </span>
            )}
          </div>
          <label className="field-label" style={{ margin: 0 }}>
            Intro paragraph
            <textarea
              value={fields.organiser_intro}
              onChange={e => handleChange('organiser_intro', e.target.value)}
              placeholder="Tell families a bit about yourself, your background and why you run this camp…"
              className="field-textarea"
              rows={6}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
