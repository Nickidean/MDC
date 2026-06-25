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
    availability: day.availability || 'available',
    book_url: day.book_url || '',
    show_on_site: day.show_on_site !== false,
  })
  const [saveStatus, setSaveStatus] = useState('') // '' | 'saving' | 'saved'
  const [imgError, setImgError] = useState(false)
  const textareaRef = useRef(null)

  // Autoresize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [fields.description])

  // Reset imgError when URL changes
  useEffect(() => {
    setImgError(false)
  }, [fields.image_url])

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
        <label className="field-label">
          Image URL
          <input
            type="url"
            value={fields.image_url}
            onChange={e => handleChange('image_url', e.target.value)}
            placeholder="https://…"
            className="field-input"
          />
        </label>

        <div className="image-preview">
          {fields.image_url && !imgError ? (
            <img
              src={fields.image_url}
              alt=""
              onError={() => setImgError(true)}
              className="day-card-img"
            />
          ) : (
            <div className="img-placeholder">No image — paste a URL above</div>
          )}
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
          <input
            type="text"
            value={fields.special_guest}
            onChange={e => handleChange('special_guest', e.target.value)}
            placeholder="Name or role"
            className="field-input"
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
