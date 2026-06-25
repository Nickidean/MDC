import React, { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

function useDebounce(fn, delay) {
  const timer = useRef(null)
  return useCallback((...args) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}

export default function DayCard({ day, onSaved }) {
  const [fields, setFields] = useState({
    image_url: day.image_url || '',
    description: day.description || '',
    special_guest: day.special_guest || '',
    special_guest_image_url: day.special_guest_image_url || '',
    special_guest_bio: day.special_guest_bio || '',
    availability: day.availability || 'available',
    book_url: day.book_url || '',
    show_on_site: day.show_on_site !== false,
  })
  const [saveStatus, setSaveStatus] = useState('')
  const [imgError, setImgError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [guestUploading, setGuestUploading] = useState(false)
  const textareaRef = useRef(null)
  const fileRef = useRef(null)
  const guestFileRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [fields.description])

  useEffect(() => { setImgError(false) }, [fields.image_url])

  async function save(updated) {
    setSaveStatus('saving')
    const { error } = await supabase
      .from('camp_days')
      .upsert({
        id: day.id,
        week: day.week,
        weekday: day.weekday,
        date_label: day.date_label,
        sort_index: day.sort_index,
        ...updated,
        updated_at: new Date().toISOString(),
      })
    if (!error) {
      setSaveStatus('saved')
      onSaved && onSaved()
      setTimeout(() => setSaveStatus(''), 2000)
    } else {
      setSaveStatus('')
      console.error('Save error:', error)
    }
  }

  const debouncedSave = useDebounce(save, 800)

  function handleChange(field, value) {
    const updated = { ...fields, [field]: value }
    setFields(updated)
    debouncedSave(updated)
  }

  async function handleGuestImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setGuestUploading(true)
    const ext = file.name.split('.').pop()
    const path = `guest-${day.sort_index}-${Date.now()}.${ext}`
    const { error: storageError } = await supabase.storage
      .from('camp-images')
      .upload(path, file, { upsert: true })
    if (storageError) {
      console.error('Guest upload error:', storageError)
      setGuestUploading(false)
      return
    }
    const { data } = supabase.storage.from('camp-images').getPublicUrl(path)
    const url = data.publicUrl
    const updated = { ...fields, special_guest_image_url: url }
    setFields(updated)
    await save(updated)
    setGuestUploading(false)
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    const ext = file.name.split('.').pop()
    const path = `day-${day.sort_index}-${Date.now()}.${ext}`
    const { error: storageError } = await supabase.storage
      .from('camp-images')
      .upload(path, file, { upsert: true })
    if (storageError) {
      console.error('Upload error:', storageError)
      setUploadError('Upload failed — make sure the camp-images bucket exists in Supabase Storage.')
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('camp-images').getPublicUrl(path)
    const url = data.publicUrl
    const updated = { ...fields, image_url: url }
    setFields(updated)
    setImgError(false)
    await save(updated)
    setUploading(false)
  }

  return (
    <div className="day-card">
      <div className="day-card-header">
        <span className="day-card-weekday">{day.weekday}</span>
        <span className="day-card-date">{day.date_label}</span>
        {saveStatus && (
          <span className={`autosave-indicator ${saveStatus}`}>
            {saveStatus === 'saving' ? 'Saving…' : 'Saved'}
          </span>
        )}
      </div>

      <div className="day-card-body">
        {/* Image preview */}
        <div className="image-preview">
          {fields.image_url && !imgError ? (
            <img
              src={fields.image_url}
              alt=""
              onError={() => setImgError(true)}
              className="day-card-img"
            />
          ) : (
            <div className="img-placeholder">No image</div>
          )}
        </div>

        {/* Upload button */}
        {uploadError && (
          <p style={{ color: 'var(--danger)', fontSize: '0.78rem', margin: '0 0 0.25rem' }}>{uploadError}</p>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ flex: 1 }}
          >
            {uploading ? 'Uploading…' : '↑ Upload image'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>or</span>
          <input
            type="url"
            value={fields.image_url}
            onChange={e => handleChange('image_url', e.target.value)}
            placeholder="Paste URL"
            className="field-input"
            style={{ flex: 2 }}
          />
        </div>

        <label className="field-label">
          Description
          <textarea
            ref={textareaRef}
            value={fields.description}
            onChange={e => handleChange('description', e.target.value)}
            placeholder="What happens on this day…"
            className="field-textarea"
            rows={3}
          />
        </label>

        <label className="field-label">
          Special guest <span className="field-optional">(optional)</span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
            <div
              className="guest-avatar-upload"
              onClick={() => guestFileRef.current?.click()}
              title={guestUploading ? 'Uploading…' : 'Upload face photo'}
              style={{ cursor: 'pointer' }}
            >
              {fields.special_guest_image_url ? (
                <img src={fields.special_guest_image_url} alt="" className="guest-avatar-img" />
              ) : (
                <span className="guest-avatar-placeholder">{guestUploading ? '…' : '+'}</span>
              )}
            </div>
            <input
              ref={guestFileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleGuestImageUpload}
            />
            <input
              type="text"
              value={fields.special_guest}
              onChange={e => handleChange('special_guest', e.target.value)}
              placeholder="Name or role"
              className="field-input"
              style={{ flex: 1 }}
            />
          </div>
          <textarea
            value={fields.special_guest_bio}
            onChange={e => handleChange('special_guest_bio', e.target.value)}
            placeholder="About this guest…"
            className="field-textarea"
            rows={2}
            style={{ marginTop: '0.4rem' }}
          />
        </label>

        <label className="field-label">
          Availability
          <select
            value={fields.availability}
            onChange={e => handleChange('availability', e.target.value)}
            className="field-select"
          >
            <option value="available">Available</option>
            <option value="nearly_full">Nearly full</option>
            <option value="full">Full</option>
          </select>
        </label>

        <label className="field-label">
          Booking link
          <input
            type="url"
            value={fields.book_url}
            onChange={e => handleChange('book_url', e.target.value)}
            placeholder="https://…"
            className="field-input"
          />
        </label>

        <label className="field-toggle">
          <input
            type="checkbox"
            checked={fields.show_on_site}
            onChange={e => handleChange('show_on_site', e.target.checked)}
          />
          Show on public site
        </label>
      </div>
    </div>
  )
}
