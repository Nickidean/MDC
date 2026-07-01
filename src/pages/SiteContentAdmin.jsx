import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const DEFAULTS = {
  organiser_name: '', organiser_intro: '', organiser_image_url: '',
  pricing_day: '£40', pricing_week: '£180', pricing_two_weeks: '£340',
  pricing_sibling_discount: '20% sibling discount on additional children',
  pricing_haf_info: 'HAF-funded places are available for eligible families at no cost. Ask us for details.',
  location_name: 'Litton Lakes', location_address: '', location_description: '', location_map_url: '', location_image_url: '',
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>{title}</h2>
      {children}
    </div>
  )
}

export default function SiteContentAdmin() {
  const [fields, setFields] = useState(DEFAULTS)
  const [saveStatus, setSaveStatus] = useState('')
  const [uploading, setUploading] = useState(false)
  const [locationUploading, setLocationUploading] = useState(false)
  const fileRef = useRef(null)
  const locationFileRef = useRef(null)
  const saveTimer = useRef(null)

  useEffect(() => {
    supabase.from('site_content').select('*').eq('id', 1).maybeSingle()
      .then(({ data }) => { if (data) setFields(f => ({ ...f, ...data })) })
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Site Content</h1>
        {saveStatus && (
          <span className={`autosave-indicator ${saveStatus}`}>
            {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
          </span>
        )}
      </div>

      {/* Organiser */}
      <Section title="About the Organiser">
        <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div className="organiser-photo-upload" onClick={() => fileRef.current?.click()} title={uploading ? 'Uploading…' : 'Upload photo'}>
              {fields.organiser_image_url
                ? <img src={fields.organiser_image_url} alt="" className="organiser-photo-img" />
                : <span className="organiser-photo-placeholder">{uploading ? '…' : '+'}</span>}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Click to upload</span>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label className="field-label" style={{ margin: 0 }}>
              Your name
              <input type="text" value={fields.organiser_name} onChange={e => handleChange('organiser_name', e.target.value)} placeholder="e.g. Sarah Jones" className="field-input" />
            </label>
            <label className="field-label" style={{ margin: 0 }}>
              Intro paragraph
              <textarea value={fields.organiser_intro} onChange={e => handleChange('organiser_intro', e.target.value)} placeholder="Tell families about yourself and why you run this camp…" className="field-textarea" rows={5} />
            </label>
          </div>
        </div>
      </Section>

      {/* Pricing */}
      <Section title="Pricing">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <label className="field-label" style={{ margin: 0 }}>
              Per day
              <input type="text" value={fields.pricing_day} onChange={e => handleChange('pricing_day', e.target.value)} placeholder="£40" className="field-input" />
            </label>
            <label className="field-label" style={{ margin: 0 }}>
              Per week
              <input type="text" value={fields.pricing_week} onChange={e => handleChange('pricing_week', e.target.value)} placeholder="£180" className="field-input" />
            </label>
            <label className="field-label" style={{ margin: 0 }}>
              Two weeks
              <input type="text" value={fields.pricing_two_weeks} onChange={e => handleChange('pricing_two_weeks', e.target.value)} placeholder="£340" className="field-input" />
            </label>
          </div>
          <label className="field-label" style={{ margin: 0 }}>
            Sibling discount note
            <input type="text" value={fields.pricing_sibling_discount} onChange={e => handleChange('pricing_sibling_discount', e.target.value)} placeholder="e.g. 20% sibling discount on additional children" className="field-input" />
          </label>
          <label className="field-label" style={{ margin: 0 }}>
            HAF information
            <textarea value={fields.pricing_haf_info} onChange={e => handleChange('pricing_haf_info', e.target.value)} placeholder="Explain HAF funding eligibility…" className="field-textarea" rows={3} />
          </label>
        </div>
      </Section>

      {/* Location */}
      <Section title="Location">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Location image upload */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div
              onClick={() => locationFileRef.current?.click()}
              title={locationUploading ? 'Uploading…' : 'Upload location photo'}
              style={{ width: 120, height: 80, borderRadius: 8, border: '2px dashed var(--border)', overflow: 'hidden', cursor: 'pointer', flexShrink: 0, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {fields.location_image_url
                ? <img src={fields.location_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{locationUploading ? 'Uploading…' : '+ Photo'}</span>}
            </div>
            <input ref={locationFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
              const file = e.target.files?.[0]
              if (!file) return
              setLocationUploading(true)
              const ext = file.name.split('.').pop()
              const path = `location-${Date.now()}.${ext}`
              const { error } = await supabase.storage.from('camp-images').upload(path, file, { upsert: true })
              if (!error) {
                const { data } = supabase.storage.from('camp-images').getPublicUrl(path)
                const updated = { ...fields, location_image_url: data.publicUrl }
                setFields(updated)
                await persist(updated)
              }
              setLocationUploading(false)
            }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label className="field-label" style={{ margin: 0 }}>
                  Venue name
                  <input type="text" value={fields.location_name} onChange={e => handleChange('location_name', e.target.value)} placeholder="e.g. Litton Lakes" className="field-input" />
                </label>
                <label className="field-label" style={{ margin: 0 }}>
                  Address
                  <input type="text" value={fields.location_address} onChange={e => handleChange('location_address', e.target.value)} placeholder="e.g. Litton Lakes, Dorset, DT2 0JX" className="field-input" />
                </label>
              </div>
              <label className="field-label" style={{ margin: 0 }}>
                Google Maps link <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(paste a maps.google.com or maps.apple.com URL)</span>
                <input type="text" value={fields.location_map_url} onChange={e => handleChange('location_map_url', e.target.value)} placeholder="https://maps.google.com/?q=Litton+Lakes" className="field-input" />
              </label>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}
