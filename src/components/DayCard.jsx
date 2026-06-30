import React, { useState, useRef, useCallback } from 'react'
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
    special_guest: day.special_guest || '',
    special_guest_image_url: day.special_guest_image_url || '',
    special_guest_bio: day.special_guest_bio || '',
  })
  const [saveStatus, setSaveStatus] = useState('')
  const [guestUploading, setGuestUploading] = useState(false)
  const guestFileRef = useRef(null)

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
        {/* Guest photo */}
        <div
          className="guest-avatar-upload guest-avatar-upload-lg"
          onClick={() => guestFileRef.current?.click()}
          title={guestUploading ? 'Uploading…' : 'Upload photo'}
          style={{ cursor: 'pointer', margin: '0 auto' }}
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

        <label className="field-label">
          Guest name
          <input
            type="text"
            value={fields.special_guest}
            onChange={e => handleChange('special_guest', e.target.value)}
            placeholder="Name or role"
            className="field-input"
          />
        </label>

        <label className="field-label">
          About this guest
          <textarea
            value={fields.special_guest_bio}
            onChange={e => handleChange('special_guest_bio', e.target.value)}
            placeholder="Who are they and what will they be doing…"
            className="field-textarea"
            rows={4}
          />
        </label>
      </div>
    </div>
  )
}
